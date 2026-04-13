import type { NextPageContext } from "next";
import NextError from "next/error";

type Props = {
  statusCode?: number;
};

function LegacyErrorPage({ statusCode }: Props) {
  return <NextError statusCode={statusCode ?? 500} />;
}

LegacyErrorPage.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res?.statusCode ?? err?.statusCode ?? 500;
  return { statusCode };
};

export default LegacyErrorPage;
