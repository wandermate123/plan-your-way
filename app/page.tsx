import QuoteClient from "./quote-client";

export default function Page() {
  return (
    <main className="container">
      <div className="header">
        <div className="brand">
          <h1>Wandermate — Instant Quote</h1>
          <p>Answer a few questions and get the exact price instantly.</p>
        </div>
      </div>
      <QuoteClient />
    </main>
  );
}

