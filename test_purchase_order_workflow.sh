#!/bin/bash

echo "🧪 Testing Complete Purchase Order Workflow"
echo "========================================="

ADMIN_TOKEN="user-1750354461611-1750738132070-y9hdfnrym1j"

# Step 1: Get a product to test with
echo "📦 Step 1: Getting test product..."
TEST_PRODUCT=$(curl -s "http://localhost:5000/api/products" -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.[0] | {id: .id, name: .name, price: .price, cost: .cost}')
PRODUCT_ID=$(echo "$TEST_PRODUCT" | jq -r '.id')
ORIGINAL_PRICE=$(echo "$TEST_PRODUCT" | jq -r '.price')
echo "Using product: $TEST_PRODUCT"

# Step 2: Create a purchase order
echo -e "\n🛒 Step 2: Creating purchase order..."
PO_DATA='{
  "supplierName": "Test Supplier Inc",
  "supplierContact": "contact@testsupplier.com",
  "orderDate": "'$(date -Iseconds)'",
  "expectedDeliveryDate": "'$(date -d '+7 days' -Iseconds)'",
  "status": "pending",
  "notes": "Test purchase order for workflow verification",
  "items": [
    {
      "productId": '$PRODUCT_ID',
      "quantityOrdered": 50,
      "unitCost": 15.50,
      "totalCost": 775.00,
      "newRetailPrice": 25.99
    }
  ]
}'

PO_RESPONSE=$(curl -s -X POST "http://localhost:5000/api/admin/purchase-orders" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$PO_DATA")

echo "Purchase order created: $PO_RESPONSE"
PO_ID=$(echo "$PO_RESPONSE" | jq -r '.purchaseOrder.id')

# Step 3: Get the created purchase order
echo -e "\n📋 Step 3: Fetching created purchase order..."
curl -s "http://localhost:5000/api/admin/purchase-orders/$PO_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .

# Step 4: Receive the purchase order
echo -e "\n📥 Step 4: Receiving purchase order..."
RECEIVE_DATA='{
  "receivedItems": [
    {
      "productId": '$PRODUCT_ID',
      "quantityReceived": 50,
      "unitCost": 15.50,
      "newPrice": 25.99
    }
  ]
}'

RECEIVE_RESPONSE=$(curl -s -X PUT "http://localhost:5000/api/purchase-orders/$PO_ID/receive" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$RECEIVE_DATA")

echo "Receive response: $RECEIVE_RESPONSE"

# Step 5: Verify product price was updated
echo -e "\n💰 Step 5: Verifying product price update..."
UPDATED_PRODUCT=$(curl -s "http://localhost:5000/api/products/$PRODUCT_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
NEW_PRICE=$(echo "$UPDATED_PRODUCT" | jq -r '.price')
NEW_COST=$(echo "$UPDATED_PRODUCT" | jq -r '.cost')

echo "Original price: $ORIGINAL_PRICE"
echo "New price: $NEW_PRICE"
echo "New cost: $NEW_COST"

# Step 6: Check price history
echo -e "\n📊 Step 6: Checking price history..."
curl -s "http://localhost:5000/api/admin/products/$PRODUCT_ID/price-history" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .

# Step 7: Verify purchase order status is updated
echo -e "\n✅ Step 7: Verifying purchase order status..."
curl -s "http://localhost:5000/api/admin/purchase-orders/$PO_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '{id: .id, status: .status, receivedBy: .receivedBy}'

echo -e "\n🎉 Purchase order workflow test complete!"
