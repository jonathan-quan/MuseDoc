import DocumentWorkspace from "../../components/DocumentWorkspace";

// `params` is a Promise in this version of Next — await it before use. The
// document itself lives in the browser (localStorage), so the workspace that
// loads and edits it is a Client Component; this server segment only resolves
// the id from the URL and hands it off.
export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DocumentWorkspace docId={id} />;
}
