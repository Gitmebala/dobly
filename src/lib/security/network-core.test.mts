import test from "node:test";
import assert from "node:assert/strict";
import { isBlockedNetworkAddress } from "./network-core.ts";

test("blocks local, private, metadata, and reserved IPv4 destinations", () => {
  for (const address of ["127.0.0.1", "10.2.3.4", "172.16.0.1", "192.168.1.1", "169.254.169.254", "224.0.0.1"]) {
    assert.equal(isBlockedNetworkAddress(address), true, address);
  }
});

test("blocks private IPv6 and IPv4-mapped private addresses", () => {
  for (const address of ["::1", "[::1]", "0:0:0:0:0:0:0:1", "fd00::1", "fe80::1", "ff02::1", "::ffff:127.0.0.1", "::ffff:7f00:1", "2002:7f00:1::1"]) {
    assert.equal(isBlockedNetworkAddress(address), true, address);
  }
});

test("allows ordinary public network addresses", () => {
  for (const address of ["1.1.1.1", "8.8.8.8", "2606:4700:4700::1111"]) {
    assert.equal(isBlockedNetworkAddress(address), false, address);
  }
});
