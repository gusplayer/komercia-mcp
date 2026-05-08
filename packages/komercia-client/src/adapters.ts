
import type { KomerciaCategory } from "./resources/categories.resource.js";
import type { KomerciaCustomer } from "./resources/customers.resource.js";
import type { KomerciaOrder } from "./resources/orders.resource.js";
import type { KomerciaProduct } from "./resources/products.resource.js";
import type {
  Category,
  Customer,
  Order,
  Product,
} from "@komercia-mcp/shared";

// Adapters bridge between Komercia's Spanish API field names and the
// canonical English types used throughout the MCP layer.
// All fields marked TODO will be verified/corrected after discovery runs.

export function toProduct(k: KomerciaProduct): Product {
  const sku = typeof k["sku"] === "string" ? k["sku"] : null;
  const rawCategoryId = k["categoria_id"];
  const categoryId =
    typeof rawCategoryId === "string" || typeof rawCategoryId === "number"
      ? String(rawCategoryId)
      : null;
  const images = Array.isArray(k["imagenes"])
    ? (k["imagenes"] as unknown[]).map(String)
    : [];
  const active = k["activo"] !== false;
  const createdAt =
    typeof k["created_at"] === "string"
      ? k["created_at"]
      : new Date().toISOString();
  const updatedAt =
    typeof k["updated_at"] === "string" ? k["updated_at"] : createdAt;

  return {
    id: String(k.id),
    name: k.nombre,
    sku,
    price: k.precio,
    compare_at_price: null, // TODO: verify field name after discovery
    stock: k.stock ?? 0,
    category_id: categoryId,
    images,
    active,
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

export function toOrder(k: KomerciaOrder): Order {
  const currency =
    typeof k["moneda"] === "string"
      ? k["moneda"]
      : typeof k["currency"] === "string"
        ? k["currency"]
        : "COP";
  const rawCustomerId = k["usuario"];
  const customerId =
    typeof rawCustomerId === "string" || typeof rawCustomerId === "number"
      ? String(rawCustomerId)
      : null;
  const createdAt =
    typeof k["created_at"] === "string" ? k["created_at"] : "";
  const updatedAt =
    typeof k["updated_at"] === "string" ? k["updated_at"] : createdAt;

  return {
    id: String(k.id),
    status: k.estado ?? "unknown",
    total: k.total ?? 0,
    currency,
    customer_id: customerId,
    items: [], // TODO: map items after discovery
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

export function toCustomer(k: KomerciaCustomer): Customer {
  const lastName =
    typeof k["apellido"] === "string" ? ` ${k["apellido"]}` : "";
  const name = k.nombre != null ? `${k.nombre}${lastName}`.trim() : String(k.id);
  const createdAt =
    typeof k["created_at"] === "string" ? k["created_at"] : "";

  return {
    id: String(k.id),
    name,
    email: k.email ?? "",
    phone: k.telefono ?? null,
    addresses: [], // TODO: map addresses after discovery
    created_at: createdAt,
  };
}

export function toCategory(k: KomerciaCategory): Category {
  return {
    id: String(k.id),
    name: k.nombre ?? String(k.id),
    slug: k.slug ?? String(k.id).toLowerCase(),
    parent_id: k.padre_id != null ? String(k.padre_id) : null,
    active: k.activo !== false,
  };
}
