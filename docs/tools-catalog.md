# Tools Catalog

All 11 tools exposed by the MCP server. Tools marked **stub** return a placeholder response — the underlying Komercia API either does not support the operation or is not yet implemented.

---

## `validate_komercia_apis`

**Backend:** Node + Laravel  
**Status:** live

Checks connectivity and authentication against both Komercia backends. Returns a Markdown table with each backend's status and response time.

**No parameters required.**

**Example prompts:**
- "Are the Komercia APIs online?"
- "Check my connection to Komercia"

---

## `get_store_info`

**Backend:** Node  
**Status:** live

Returns basic information about the merchant's store: name, store ID, domain URL, plan expiry date, registration email, and whether the store is currently active.

**No parameters required.**

**Example prompts:**
- "What's the name of my store?"
- "Show me my store details"
- "Is my store active?"
- "What plan am I on?"

---

## `export_products`

**Backend:** Node  
**Status:** live

Exports the full product catalog. Supports four formats:

| Format | Use case |
|--------|----------|
| `csv` | Spreadsheet / generic import |
| `json` | Developers / custom scripts |
| `shopify` | Shopify Products CSV import |
| `woocommerce` | WooCommerce Products CSV import |

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `format` | `"csv" \| "json" \| "shopify" \| "woocommerce"` | yes | Export format |
| `category_id` | string | no | Filter to a specific category by its ID |

**Example prompts:**
- "Export all my products as CSV"
- "Give me my product list in Shopify format"
- "Export products from category 12748 as JSON"

**Note:** Paginated internally with small page size (5) to avoid a known Komercia API bug where `limit > total_products` returns HTTP 500. Stores with many products will fetch multiple pages automatically.

---

## `export_orders`

**Backend:** Node  
**Status:** live

Exports the complete order history as CSV. Returns all orders including columns: customer name, ID type, ID number, email, city, phone, total, purchase date, payment method, coupon, order status, and delivery status.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `currency` | string | no | Currency code for totals (e.g. `COP`, `USD`). Defaults to `COP`. |

**Example prompts:**
- "Export all my orders"
- "Give me my orders history as CSV"
- "Download all orders in USD"

---

## `export_customers`

**Backend:** Node  
**Status:** live

Exports the full customer list as CSV. Columns: name, ID type, ID number, email, city, phone, purchase count, completed purchases value, last purchase date, coupon usage, preferred payment method.

**No parameters required.**

**Example prompts:**
- "Export my customer list"
- "Give me all my customers as CSV"
- "Who are my top customers?"

---

## `export_categories`

**Backend:** Node  
**Status:** live

Exports the store's category hierarchy as a tree. Returns categories and subcategories. Inactive categories are marked.

**No parameters required.**

**Example prompts:**
- "Show me my product categories"
- "Export my category structure"
- "What categories does my store have?"

---

## `export_theme_config`

**Backend:** Node  
**Status:** live (degraded — endpoint unstable)

Attempts to export storefront theme settings (colors, fonts, layout). The underlying Komercia endpoint (`/api/v1/templates/websites`) consistently returns HTTP 500 as of 2026-05. When that happens the tool returns honest instructions for exporting manually via the browser developer tools.

**No parameters required.**

**Example prompts:**
- "Export my store theme settings"
- "What colors and fonts does my store use?"
- "Back up my theme configuration"

---

## `list_payment_gateways`

**Backend:** Laravel  
**Status:** live

Lists all payment gateways configured for the store (e.g. Wompi, PayU, Mercado Pago, COD).

**No parameters required.**

**Example prompts:**
- "What payment methods does my store accept?"
- "List my payment gateways"
- "Is PayU configured?"

---

## `export_inventory_movements`

**Backend:** —  
**Status:** stub

Returns a placeholder. Komercia does not expose a direct inventory movement history endpoint. A future version may derive movements from order history.

**No parameters required.**

---

## `download_media_archive`

**Backend:** —  
**Status:** stub

Returns a placeholder. A future version will walk all product image URLs and package them into a downloadable archive via a background job.

**No parameters required.**

---

## `suggest_alternative_platforms`

**Backend:** none (local logic)  
**Status:** live

Analyzes the store profile and recommends alternative e-commerce platforms for migration. Covers Shopify, Tiendanube, WooCommerce, Jumpseller, Vtex, and Wix — with estimated migration effort and relevant export formats.

**No parameters required.**

**Example prompts:**
- "What platform should I migrate to?"
- "Compare Shopify vs Tiendanube for my store"
- "Which platform is best for LATAM merchants?"
