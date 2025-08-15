
import { Router } from 'express';
import { db } from '../db';
import { purchaseOrders, purchaseOrderItems, users } from '../../shared/schema';
import { eq, desc } from 'drizzle-orm';

const router = Router();

// Get all purchase orders
router.get('/purchase-orders', async (req, res) => {
  try {
    const orders = await db
      .select({
        id: purchaseOrders.id,
        orderNumber: purchaseOrders.orderNumber,
        supplierName: purchaseOrders.supplierName,
        supplierId: purchaseOrders.supplierId,
        status: purchaseOrders.status,
        totalCost: purchaseOrders.totalCost,
        notes: purchaseOrders.notes,
        createdAt: purchaseOrders.createdAt,
        createdBy: purchaseOrders.createdBy,
        receivedBy: purchaseOrders.receivedBy,
        receivedAt: purchaseOrders.receivedAt,
        createdByName: users.username,
      })
      .from(purchaseOrders)
      .leftJoin(users, eq(purchaseOrders.createdBy, users.id))
      .orderBy(desc(purchaseOrders.createdAt));

    res.json(orders);
  } catch (error) {
    console.error('Error fetching purchase orders:', error);
    res.status(500).json({ message: 'Failed to fetch purchase orders' });
  }
});

// Get purchase order by ID with items
router.get('/purchase-orders/:id', async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);

    const [order] = await db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, orderId));

    if (!order) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }

    const items = await db
      .select()
      .from(purchaseOrderItems)
      .where(eq(purchaseOrderItems.purchaseOrderId, orderId));

    res.json({
      ...order,
      items,
    });
  } catch (error) {
    console.error('Error fetching purchase order:', error);
    res.status(500).json({ message: 'Failed to fetch purchase order' });
  }
});

// Create new purchase order
router.post('/purchase-orders', async (req, res) => {
  try {
    const {
      supplierName,
      supplierAddress,
      invoiceNumber,
      invoiceDate,
      items,
      totalAmount,
      status = 'pending_approval',
      createdBy
    } = req.body;

    // Validate required fields
    if (!supplierName || !items || items.length === 0) {
      return res.status(400).json({ message: 'Supplier name and items are required' });
    }

    // Create purchase order using correct schema fields
    const orderNumber = `PO-${Date.now()}`;
    const [newOrder] = await db
      .insert(purchaseOrders)
      .values({
        orderNumber,
        supplierName,
        supplierId: null, // Can be set later if needed
        status: status || 'pending',
        totalCost: parseFloat(totalAmount.toString()),
        notes: `Invoice: ${invoiceNumber || 'N/A'}`,
        createdBy: createdBy || (req as any).user?.id,
      })
      .returning();

    // Create purchase order items using correct schema fields
    const orderItems = items.map((item: any) => ({
      purchaseOrderId: newOrder.id,
      productId: item.productId || null,
      quantityOrdered: parseInt(item.quantity.toString()),
      unitCost: parseFloat(item.unitPrice.toString()),
      totalCost: parseFloat(item.totalPrice.toString()),
    }));

    await db.insert(purchaseOrderItems).values(orderItems);

    res.status(201).json({
      success: true,
      id: newOrder.id,
      message: 'Purchase order created successfully',
    });
  } catch (error) {
    console.error('Error creating purchase order:', error);
    res.status(500).json({ message: 'Failed to create purchase order' });
  }
});

// Update purchase order status (approve/reject)
router.patch('/purchase-orders/:id/status', async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const { status, notes } = req.body;
    const userId = (req as any).user?.id;

    if (!['pending_approval', 'approved', 'rejected', 'ordered', 'received'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const updateData: any = {
      status,
      updatedAt: new Date(),
    };

    if (status === 'approved') {
      updateData.approvedBy = userId;
      updateData.approvedAt = new Date();
    }

    if (notes) {
      updateData.notes = notes;
    }

    await db
      .update(purchaseOrders)
      .set(updateData)
      .where(eq(purchaseOrders.id, orderId));

    res.json({
      success: true,
      message: `Purchase order ${status} successfully`,
    });
  } catch (error) {
    console.error('Error updating purchase order status:', error);
    res.status(500).json({ message: 'Failed to update purchase order status' });
  }
});

// Delete purchase order
router.delete('/purchase-orders/:id', async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);

    // Delete items first (foreign key constraint)
    await db
      .delete(purchaseOrderItems)
      .where(eq(purchaseOrderItems.purchaseOrderId, orderId));

    // Delete purchase order
    await db
      .delete(purchaseOrders)
      .where(eq(purchaseOrders.id, orderId));

    res.json({
      success: true,
      message: 'Purchase order deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting purchase order:', error);
    res.status(500).json({ message: 'Failed to delete purchase order' });
  }
});

export default router;
