-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'READY_FOR_COLLECTION', 'COLLECTED', 'CANCELLED');

-- CreateTable: carts (one per user)
CREATE TABLE "carts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable: cart_items
CREATE TABLE "cart_items" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "medicationId" TEXT NOT NULL,
    "dispensaryId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "priceAtAdd" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable: orders
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dispensaryId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "stripePaymentId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable: order_items
CREATE TABLE "order_items" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "medicationId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateUniqueIndex: one cart per user
CREATE UNIQUE INDEX "carts_userId_key" ON "carts"("userId");

-- AddForeignKey: cart -> user
ALTER TABLE "carts" ADD CONSTRAINT "carts_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: cart_item -> cart
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cartId_fkey"
    FOREIGN KEY ("cartId") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: cart_item -> medication
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_medicationId_fkey"
    FOREIGN KEY ("medicationId") REFERENCES "medications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: cart_item -> dispensary
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_dispensaryId_fkey"
    FOREIGN KEY ("dispensaryId") REFERENCES "dispensaries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: order -> user
ALTER TABLE "orders" ADD CONSTRAINT "orders_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: order -> dispensary
ALTER TABLE "orders" ADD CONSTRAINT "orders_dispensaryId_fkey"
    FOREIGN KEY ("dispensaryId") REFERENCES "dispensaries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: order_item -> order
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: order_item -> medication
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_medicationId_fkey"
    FOREIGN KEY ("medicationId") REFERENCES "medications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
