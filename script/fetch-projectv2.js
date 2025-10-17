const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));
const GH_TOKEN = process.env.GITHUB_TOKEN;
const PROJECT_OWNER = process.env.PROJECT_OWNER || "";
const PROJECT_NUMBER = Number(process.env.PROJECT_NUMBER || "1");
if (!GH_TOKEN || !PROJECT_NUMBER) throw new Error("GITHUB_TOKEN or PROJECT_NUMBER missing");
const endpoint = "https://api.github.com/graphql";
const headers = { "Content-Type": "application/json", "Authorization": `bearer ${GH_TOKEN}` };
const qViewer = `query { viewer { login } rateLimit { remaining resetAt } }`;
const qUser = `
  query($login: String!, $number: Int!) {
    user(login: $login) {
      projectV2(number: $number) {
        id title
        items(first: 100) { nodes { id content { ... on Issue { title url number } ... on PullRequest { title url number } }
          fieldValues(first: 20) { nodes {
            __typename
            ... on ProjectV2ItemFieldDateValue { date field { name } }
            ... on ProjectV2ItemFieldTextValue { text field { name } }
            ... on ProjectV2ItemFieldSingleSelectValue { name field { name } }
            ... on ProjectV2ItemFieldNumberValue { number field { name } }
          } } } }
    } }`;
const qOrg = `
  query($login: String!, $number: Int!) {
    organization(login: $login) {
      projectV2(number: $number) {
        id title
        items(first: 100) { nodes { id content { ... on Issue { title url number } ... on PullRequest { title url number } }
          fieldValues(first: 20) { nodes {
            __typename
            ... on ProjectV2ItemFieldDateValue { date field { name } }
            ... on ProjectV2ItemFieldTextValue { text field { name } }
            ... on ProjectV2ItemFieldSingleSelectValue { name field { name } }
            ... on ProjectV2ItemFieldNumberValue { number field { name } }
          } } } }
    } }`;
async function gql(query, variables) {
  const res = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify({ query, variables }) });
  const json = await res.json();
  if (json.errors) console.error("GraphQL errors:", JSON.stringify(json.errors, null, 2));
  if (!json.data) throw new Error("GraphQL returned no data (see errors above).");
  return json;
}
(async () => {
  const viewer = await gql(qViewer, {});
  console.log("viewer:", viewer.data.viewer.login, "rateRemaining:", viewer.data.rateLimit.remaining);
  if (!PROJECT_OWNER) {
    const login = viewer.data.viewer.login;
    const dataUser = await gql(qUser, { login, number: PROJECT_NUMBER });
    const project = dataUser.data.user?.projectV2;
    if (!project) throw new Error(\`No user project found: \${login} #\${PROJECT_NUMBER}\`);
    console.log("project(title):", project.title);
    console.log("items count:", project.items.nodes?.length || 0);
    return;
  }
  try {
    const dataUser = await gql(qUser, { login: PROJECT_OWNER, number: PROJECT_NUMBER });
    if (dataUser.data.user?.projectV2) {
      const p = dataUser.data.user.projectV2;
      console.log("USER project:", p.title);
      console.log("items:", p.items.nodes?.length || 0);
      return;
    }
  } catch (e) {
    console.warn("user path failed:", String(e));
  }
  const dataOrg = await gql(qOrg, { login: PROJECT_OWNER, number: PROJECT_NUMBER });
  const p2 = dataOrg.data.organization?.projectV2;
  if (!p2) throw new Error(\`No org project found: \${PROJECT_OWNER} #\${PROJECT_NUMBER}\`);
  console.log("ORG project:", p2.title);
  console.log("items:", p2.items.nodes?.length || 0);
})();
