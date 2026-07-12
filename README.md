# n8n-nodes-finviz

This is an n8n community node. It lets you use [Finviz Elite](https://elite.finviz.com/) in your n8n workflows.

Finviz is a stock screener and financial data platform. This node fetches screener results from the Finviz Elite export API and outputs them as structured JSON items.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

[Installation](#installation)
[Operations](#operations)
[Credentials](#credentials)
[Compatibility](#compatibility)
[Usage](#usage)
[Resources](#resources)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

## Operations

- **Fetch screener data** — Paste a Finviz screener URL to get results. Supports:
  - Custom column selection (via the `&c=` URL parameter)
  - Custom filters (via the `&f=` URL parameter)
  - Sorting (via the `&o=` URL parameter)
  - Return all results or limit to a specific count
  - A screener name label added to each output item
  - Multiple **Output Format** options:
    - **JSON** (default) — one item per row, each column a field
    - **CSV (Binary File)** — the raw CSV attached as a binary file (e.g. to commit to GitHub)
    - **CSV (Text)** — the raw CSV as a string in a single field

## Credentials

You need a [Finviz Elite](https://elite.finviz.com/) subscription. The export API is not available on the free tier.

1. Log in to Finviz Elite
2. Go to your account page to find your API key
3. In n8n, create a new **Finviz API** credential and paste your API key

## Compatibility

Tested with n8n 1.x. Requires `n8nNodesApiVersion: 1`.

## Usage

1. Go to [elite.finviz.com/screener](https://elite.finviz.com/screener.ashx) and configure your filters
2. To choose which columns are returned, go to the **Custom** tab, click **Customize**, and toggle your columns — the URL will include a `&c=` parameter
3. Copy the URL from your browser
4. In your n8n workflow, add the **Finviz** node
5. Paste the URL into the **Screener URL** field
6. Optionally set a **Screener Name** to label the output
7. Choose whether to return all results or set a limit
8. Execute the node

The node converts the screener URL to an export URL, fetches the CSV, and by default outputs each row as a JSON item. Choose the **Output Format** to instead get the raw CSV as a binary file or a text string. `Return All` / `Limit` apply to every format.

### Commit the CSV to GitHub

1. Set **Output Format** to **CSV (Binary File)** on the Finviz node (optionally set a **File Name**; it defaults to the Screener Name)
2. Add a **GitHub** node after it, choose **File → Create** (or **Edit**)
3. Enable **Binary File** and set the **Input Binary Field** to `data` (the Finviz node's default **Output Field**)
4. Set the repository, file path, and commit message on the GitHub node

To fetch multiple screeners, feed multiple URLs from an upstream node — each input item is processed independently.

This node has `usableAsTool` enabled, so it can be used as a tool by n8n AI Agent nodes.

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
- [Finviz Elite API](https://elite.finviz.com/)
