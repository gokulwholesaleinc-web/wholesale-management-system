import { relations } from "drizzle-orm/relations";
import { orders, orderItems, products, users, categories, deliveryAddresses, cartItems } from "./schema";

export const orderItemsRelations = relations(orderItems, ({one}) => ({
	order: one(orders, {
		fields: [orderItems.orderId],
		references: [orders.id]
	}),
	product: one(products, {
		fields: [orderItems.productId],
		references: [products.id]
	}),
}));

export const ordersRelations = relations(orders, ({one, many}) => ({
	orderItems: many(orderItems),
	user: one(users, {
		fields: [orders.userId],
		references: [users.id]
	}),
}));

export const productsRelations = relations(products, ({one, many}) => ({
	orderItems: many(orderItems),
	category: one(categories, {
		fields: [products.categoryId],
		references: [categories.id]
	}),
	cartItems: many(cartItems),
}));

export const usersRelations = relations(users, ({many}) => ({
	orders: many(orders),
	deliveryAddresses: many(deliveryAddresses),
	cartItems: many(cartItems),
}));

export const categoriesRelations = relations(categories, ({many}) => ({
	products: many(products),
}));

export const deliveryAddressesRelations = relations(deliveryAddresses, ({one}) => ({
	user: one(users, {
		fields: [deliveryAddresses.userId],
		references: [users.id]
	}),
}));

export const cartItemsRelations = relations(cartItems, ({one}) => ({
	user: one(users, {
		fields: [cartItems.userId],
		references: [users.id]
	}),
	product: one(products, {
		fields: [cartItems.productId],
		references: [products.id]
	}),
}));