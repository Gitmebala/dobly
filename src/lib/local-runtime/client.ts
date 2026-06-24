import "server-only";
import { prepareRow, mutateTable, readTable } from "./store";
import { userFromSessionToken, type LocalUser } from "./auth";

type Filter = (row: Record<string, unknown>) => boolean;
type Operation = "select" | "insert" | "update" | "upsert" | "delete";

class LocalQuery implements PromiseLike<{ data: any; error: any; count?: number }> {
  private filters: Filter[] = [];
  private operation: Operation = "select";
  private payload: Record<string, unknown>[] = [];
  private orderBy?: { column: string; ascending: boolean };
  private rowLimit?: number;
  private rowRange?: [number, number];
  private singleMode: "none" | "single" | "maybe" = "none";
  private conflictColumns = ["id"];
  private headOnly = false;

  constructor(private table: string) {}

  select(_columns = "*", options?: { head?: boolean; count?: string }) {
    this.headOnly = options?.head === true;
    return this;
  }

  insert(value: Record<string, unknown> | Record<string, unknown>[]) {
    this.operation = "insert";
    this.payload = Array.isArray(value) ? value : [value];
    return this;
  }

  update(value: Record<string, unknown>) {
    this.operation = "update";
    this.payload = [value];
    return this;
  }

  upsert(value: Record<string, unknown> | Record<string, unknown>[], options?: { onConflict?: string }) {
    this.operation = "upsert";
    this.payload = Array.isArray(value) ? value : [value];
    this.conflictColumns = (options?.onConflict || "id")
      .split(",")
      .map((column) => column.trim())
      .filter(Boolean);
    return this;
  }

  delete() {
    this.operation = "delete";
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push((row) => row[column] === value);
    return this;
  }

  neq(column: string, value: unknown) {
    this.filters.push((row) => row[column] !== value);
    return this;
  }

  in(column: string, values: unknown[]) {
    this.filters.push((row) => values.includes(row[column]));
    return this;
  }

  is(column: string, value: unknown) {
    this.filters.push((row) => row[column] === value);
    return this;
  }

  like(column: string, value: string) {
    const pattern = postgrestPattern(value);
    this.filters.push((row) => pattern.test(String(row[column] ?? "")));
    return this;
  }

  ilike(column: string, value: string) {
    const pattern = postgrestPattern(value, "i");
    this.filters.push((row) => pattern.test(String(row[column] ?? "")));
    return this;
  }

  contains(column: string, value: unknown) {
    this.filters.push((row) => containsValue(row[column], value));
    return this;
  }

  overlaps(column: string, value: unknown[]) {
    this.filters.push((row) => Array.isArray(row[column]) && row[column].some((item) => value.includes(item)));
    return this;
  }

  not(column: string, operator: string, value: unknown) {
    if (operator === "is") {
      this.filters.push((row) => row[column] !== value);
      return this;
    }
    if (operator === "in") {
      const values = parsePostgrestList(value);
      this.filters.push((row) => !values.includes(row[column]));
      return this;
    }
    if (operator === "eq") return this.neq(column, value);
    return this;
  }

  or(expression: string) {
    const branches = splitOrExpression(expression)
      .map((branch) => predicateFromExpression(branch))
      .filter((predicate): predicate is Filter => Boolean(predicate));
    if (branches.length) this.filters.push((row) => branches.some((predicate) => predicate(row)));
    return this;
  }

  gt(column: string, value: unknown) {
    this.filters.push((row) => (row[column] as any) > (value as any));
    return this;
  }

  gte(column: string, value: unknown) {
    this.filters.push((row) => (row[column] as any) >= (value as any));
    return this;
  }

  lt(column: string, value: unknown) {
    this.filters.push((row) => (row[column] as any) < (value as any));
    return this;
  }

  lte(column: string, value: unknown) {
    this.filters.push((row) => (row[column] as any) <= (value as any));
    return this;
  }

  match(values: Record<string, unknown>) {
    Object.entries(values).forEach(([column, value]) => this.eq(column, value));
    return this;
  }

  filter(column: string, operator: string, value: unknown) {
    if (operator === "eq") return this.eq(column, value);
    if (operator === "neq") return this.neq(column, value);
    if (operator === "gte") return this.gte(column, value);
    if (operator === "lte") return this.lte(column, value);
    if (operator === "like") return this.like(column, String(value));
    if (operator === "ilike") return this.ilike(column, String(value));
    if (operator === "contains" || operator === "cs") return this.contains(column, value);
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderBy = { column, ascending: options?.ascending !== false };
    return this;
  }

  limit(value: number) {
    this.rowLimit = value;
    return this;
  }

  range(from: number, to: number) {
    this.rowRange = [from, to];
    return this;
  }

  single() {
    this.singleMode = "single";
    return this;
  }

  maybeSingle() {
    this.singleMode = "maybe";
    return this;
  }

  then<TResult1 = { data: any; error: any; count?: number }, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: any; count?: number }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  catch<TResult = never>(
    onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null,
  ) {
    return this.execute().catch(onrejected);
  }

  finally(onfinally?: (() => void) | null) {
    return this.execute().finally(onfinally ?? undefined);
  }

  private matches(row: Record<string, unknown>) {
    return this.filters.every((filter) => filter(row));
  }

  private shape(rows: Record<string, unknown>[]) {
    let result = [...rows];
    if (this.orderBy) {
      const { column, ascending } = this.orderBy;
      result.sort((left, right) => {
        const a = left[column] as any;
        const b = right[column] as any;
        return (a === b ? 0 : a > b ? 1 : -1) * (ascending ? 1 : -1);
      });
    }
    if (this.rowRange) result = result.slice(this.rowRange[0], this.rowRange[1] + 1);
    if (this.rowLimit !== undefined) result = result.slice(0, this.rowLimit);
    const count = result.length;
    if (this.headOnly) return { data: null, error: null, count };
    if (this.singleMode !== "none") {
      if (result.length === 0) {
        return this.singleMode === "maybe"
          ? { data: null, error: null }
          : { data: null, error: { code: "PGRST116", message: "No rows found" } };
      }
      return { data: result[0], error: null };
    }
    return { data: result, error: null, count };
  }

  private async execute() {
    try {
      if (this.operation === "select") {
        return this.shape((await readTable(this.table)).filter((row) => this.matches(row)));
      }

      const changed = await mutateTable(this.table, (rows) => {
        if (this.operation === "insert") {
          const inserted = this.payload.map((row) => prepareRow(row));
          rows.push(...inserted);
          return inserted;
        }
        if (this.operation === "update") {
          const updated: Record<string, unknown>[] = [];
          rows.forEach((row, index) => {
            if (!this.matches(row)) return;
            rows[index] = { ...row, ...this.payload[0], updated_at: new Date().toISOString() };
            updated.push(rows[index]);
          });
          return updated;
        }
        if (this.operation === "upsert") {
          return this.payload.map((payload) => {
            const index = rows.findIndex((row) =>
              this.conflictColumns.every((column) => row[column] === payload[column]),
            );
            const next = prepareRow(index >= 0 ? { ...rows[index], ...payload } : payload);
            if (index >= 0) rows[index] = next;
            else rows.push(next);
            return next;
          });
        }
        const removed = rows.filter((row) => this.matches(row));
        for (let index = rows.length - 1; index >= 0; index -= 1) {
          if (this.matches(rows[index])) rows.splice(index, 1);
        }
        return removed;
      });
      return this.shape(changed);
    } catch (error) {
      return { data: null, error: { message: error instanceof Error ? error.message : "Local database error" } };
    }
  }
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function postgrestPattern(value: string, flags?: string) {
  return new RegExp(`^${escapeRegExp(value).replace(/%/g, ".*").replace(/_/g, ".")}$`, flags);
}

function containsValue(candidate: unknown, expected: unknown): boolean {
  if (Array.isArray(candidate) && Array.isArray(expected)) {
    return expected.every((item) => candidate.includes(item));
  }
  if (candidate && expected && typeof candidate === "object" && typeof expected === "object") {
    return Object.entries(expected as Record<string, unknown>).every(
      ([key, value]) => containsValue((candidate as Record<string, unknown>)[key], value),
    );
  }
  return candidate === expected;
}

function parsePostgrestList(value: unknown) {
  if (Array.isArray(value)) return value;
  return String(value ?? "")
    .replace(/^\(/, "")
    .replace(/\)$/, "")
    .split(",")
    .map((item) => parsePostgrestValue(item.trim()));
}

function parsePostgrestValue(value: string): unknown {
  if (value === "null") return null;
  if (value === "true") return true;
  if (value === "false") return false;
  const numeric = Number(value);
  return value !== "" && Number.isFinite(numeric) ? numeric : value;
}

function splitOrExpression(expression: string) {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < expression.length; index += 1) {
    if (expression[index] === "(") depth += 1;
    if (expression[index] === ")") depth -= 1;
    if (expression[index] === "," && depth === 0) {
      parts.push(expression.slice(start, index));
      start = index + 1;
    }
  }
  parts.push(expression.slice(start));
  return parts.map((part) => part.trim()).filter(Boolean);
}

function predicateFromExpression(expression: string): Filter | null {
  const [column, operator, ...rest] = expression.split(".");
  if (!column || !operator) return null;
  const rawValue = rest.join(".");
  const value = parsePostgrestValue(rawValue);
  if (operator === "eq") return (row) => row[column] === value;
  if (operator === "neq") return (row) => row[column] !== value;
  if (operator === "is") return (row) => row[column] === value;
  if (operator === "gt") return (row) => (row[column] as any) > (value as any);
  if (operator === "gte") return (row) => (row[column] as any) >= (value as any);
  if (operator === "lt") return (row) => (row[column] as any) < (value as any);
  if (operator === "lte") return (row) => (row[column] as any) <= (value as any);
  if (operator === "like") {
    const pattern = postgrestPattern(rawValue);
    return (row) => pattern.test(String(row[column] ?? ""));
  }
  if (operator === "ilike") {
    const pattern = postgrestPattern(rawValue, "i");
    return (row) => pattern.test(String(row[column] ?? ""));
  }
  return null;
}

function sameWorkspace(row: Record<string, unknown>, userId: unknown, workspaceId: unknown) {
  return row.user_id === userId && (row.workspace_id ?? null) === (workspaceId ?? null);
}

async function localBillingRpc(name: string, args: Record<string, any>) {
  if (name === "dobly_fund_wallet") {
    const existingLedger = (await readTable("billing_wallet_ledger")).find(
      (row) => row.idempotency_key === args.p_idempotency_key,
    );
    let wallet = (await readTable("billing_wallets")).find((row) =>
      sameWorkspace(row, args.p_user_id, args.p_workspace_id),
    );
    if (!wallet) {
      wallet = prepareRow({
        user_id: args.p_user_id,
        workspace_id: args.p_workspace_id ?? null,
        currency: "KES",
        available_minor: 0,
        reserved_minor: 0,
        lifetime_funded_minor: 0,
        lifetime_spent_minor: 0,
      });
      const created = wallet;
      await mutateTable("billing_wallets", (rows) => rows.push(created));
    }
    if (existingLedger) return { data: wallet, error: null };
    const amount = Number(args.p_amount_minor ?? 0);
    const walletId = wallet.id;
    const next = await mutateTable("billing_wallets", (rows) => {
      const index = rows.findIndex((row) => row.id === walletId);
      rows[index] = prepareRow({
        ...rows[index],
        available_minor: Number(rows[index].available_minor ?? 0) + amount,
        lifetime_funded_minor: Number(rows[index].lifetime_funded_minor ?? 0) + amount,
      });
      return rows[index];
    });
    await mutateTable("billing_wallet_ledger", (rows) => rows.push(prepareRow({
      wallet_id: next.id,
      user_id: args.p_user_id,
      workspace_id: args.p_workspace_id ?? null,
      entry_type: "fund",
      amount_minor: amount,
      balance_after_minor: next.available_minor,
      source: args.p_source,
      idempotency_key: args.p_idempotency_key,
      external_reference: args.p_external_reference ?? null,
      metadata: args.p_metadata ?? {},
    })));
    return { data: next, error: null };
  }

  if (name === "dobly_reserve_usage") {
    const existing = (await readTable("billing_usage_reservations")).find(
      (row) => row.idempotency_key === args.p_idempotency_key,
    );
    if (existing) return { data: existing, error: null };
    const wallet = (await readTable("billing_wallets")).find((row) =>
      sameWorkspace(row, args.p_user_id, args.p_workspace_id),
    );
    const estimated = Number(args.p_estimated_minor ?? 0);
    const spendable = Number(wallet?.available_minor ?? 0) - Number(wallet?.reserved_minor ?? 0);
    if (!wallet || spendable < estimated) {
      return { data: null, error: { message: "DOBLY_INSUFFICIENT_OPERATING_CAPACITY" } };
    }
    const reservation = prepareRow({
      wallet_id: wallet.id,
      user_id: args.p_user_id,
      workspace_id: args.p_workspace_id ?? null,
      run_id: args.p_run_id ?? null,
      job_id: args.p_job_id ?? null,
      coworker_id: args.p_coworker_id ?? null,
      capability: args.p_capability,
      provider: args.p_provider,
      estimated_minor: estimated,
      actual_minor: null,
      status: "reserved",
      idempotency_key: args.p_idempotency_key,
      metadata: args.p_metadata ?? {},
      expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    });
    await mutateTable("billing_usage_reservations", (rows) => rows.push(reservation));
    await mutateTable("billing_wallets", (rows) => {
      const index = rows.findIndex((row) => row.id === wallet.id);
      rows[index] = prepareRow({ ...rows[index], reserved_minor: Number(rows[index].reserved_minor ?? 0) + estimated });
    });
    return { data: reservation, error: null };
  }

  if (name === "dobly_settle_usage") {
    const reservation = (await readTable("billing_usage_reservations")).find((row) => row.id === args.p_reservation_id);
    if (!reservation) return { data: null, error: { message: "Reservation not found" } };
    if (reservation.status === "settled") return { data: reservation, error: null };
    const actual = Number(args.p_actual_minor ?? 0);
    const wallet = (await readTable("billing_wallets")).find((row) => row.id === reservation.wallet_id);
    const reservedByOthers = Math.max(0, Number(wallet?.reserved_minor ?? 0) - Number(reservation.estimated_minor ?? 0));
    if (!wallet || Number(wallet.available_minor ?? 0) - reservedByOthers < actual) {
      return { data: null, error: { message: "DOBLY_INSUFFICIENT_OPERATING_CAPACITY" } };
    }
    const nextWallet = await mutateTable("billing_wallets", (rows) => {
      const index = rows.findIndex((row) => row.id === wallet.id);
      rows[index] = prepareRow({
        ...rows[index],
        available_minor: Number(rows[index].available_minor ?? 0) - actual,
        reserved_minor: Math.max(0, Number(rows[index].reserved_minor ?? 0) - Number(reservation.estimated_minor ?? 0)),
        lifetime_spent_minor: Number(rows[index].lifetime_spent_minor ?? 0) + actual,
      });
      return rows[index];
    });
    await mutateTable("billing_wallet_ledger", (rows) => rows.push(prepareRow({
      wallet_id: wallet.id,
      user_id: reservation.user_id,
      workspace_id: reservation.workspace_id ?? null,
      entry_type: "debit",
      amount_minor: -actual,
      balance_after_minor: nextWallet.available_minor,
      source: "usage_settlement",
      idempotency_key: `settlement:${reservation.id}`,
      external_reference: args.p_provider_request_id ?? null,
      metadata: args.p_metadata ?? {},
    })));
    await mutateTable("billing_usage_events", (rows) => rows.push(prepareRow({
      reservation_id: reservation.id,
      user_id: reservation.user_id,
      workspace_id: reservation.workspace_id ?? null,
      run_id: reservation.run_id ?? null,
      job_id: reservation.job_id ?? null,
      coworker_id: reservation.coworker_id ?? null,
      capability: reservation.capability,
      provider: reservation.provider,
      estimated_cost_minor: reservation.estimated_minor,
      actual_cost_minor: actual,
      customer_cost_minor: actual,
      status: args.p_status ?? "succeeded",
      provider_request_id: args.p_provider_request_id ?? null,
      metadata: args.p_metadata ?? {},
    })));
    const settled = await mutateTable("billing_usage_reservations", (rows) => {
      const index = rows.findIndex((row) => row.id === reservation.id);
      rows[index] = prepareRow({ ...rows[index], actual_minor: actual, status: "settled", settled_at: new Date().toISOString() });
      return rows[index];
    });
    return { data: settled, error: null };
  }

  if (name === "dobly_release_usage") {
    const reservation = (await readTable("billing_usage_reservations")).find((row) => row.id === args.p_reservation_id);
    if (!reservation) return { data: null, error: { message: "Reservation not found" } };
    if (reservation.status !== "reserved") return { data: reservation, error: null };
    await mutateTable("billing_wallets", (rows) => {
      const index = rows.findIndex((row) => row.id === reservation.wallet_id);
      if (index >= 0) rows[index] = prepareRow({
        ...rows[index],
        reserved_minor: Math.max(0, Number(rows[index].reserved_minor ?? 0) - Number(reservation.estimated_minor ?? 0)),
      });
    });
    const released = await mutateTable("billing_usage_reservations", (rows) => {
      const index = rows.findIndex((row) => row.id === reservation.id);
      rows[index] = prepareRow({ ...rows[index], status: "released", settled_at: new Date().toISOString(), metadata: { ...(rows[index].metadata as object ?? {}), release_reason: args.p_reason } });
      return rows[index];
    });
    return { data: released, error: null };
  }

  return { data: null, error: { message: `Unsupported local RPC: ${name}` } };
}

export function createLocalServerClient(userPromise: Promise<LocalUser | null>) {
  return {
    auth: {
      async getUser() {
        return { data: { user: await userPromise }, error: null };
      },
    },
    from(table: string) {
      return new LocalQuery(table);
    },
    async rpc() {
      return { data: null, error: null };
    },
  };
}

export function createLocalAdminClient() {
  return {
    from(table: string) {
      return new LocalQuery(table);
    },
    auth: {
      admin: {
        async deleteUser(id: string) {
          await mutateTable("_users", (rows) => {
            const index = rows.findIndex((row) => row.id === id);
            if (index >= 0) rows.splice(index, 1);
          });
          return { data: null, error: null };
        },
      },
    },
    rpc(name: string, args: Record<string, unknown> = {}) {
      return localBillingRpc(name, args);
    },
  };
}

export function localUserFromCookie(token?: string | null) {
  return userFromSessionToken(token);
}
