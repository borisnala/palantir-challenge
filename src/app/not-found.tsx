import Link from "@/components/nav-link";

// Shown for an address the app does not have, inside the app's own frame, with a way back.
export default function NotFound() {
  return (
    <div className="notfound">
      <h1>Screen not available</h1>
      <p>This address is not part of Risk Tool.</p>
      <Link href="/" className="pillbtn">Open Morning Digest</Link>
    </div>
  );
}
