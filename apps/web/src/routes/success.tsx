import { Link, createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/success")({
  component: () => (
    <main className="panel">
      <h1>Thank you</h1>
      <p>Your order will appear after the payment provider confirms it.</p>
      <Link to="/app">Return to app</Link>
    </main>
  ),
});
