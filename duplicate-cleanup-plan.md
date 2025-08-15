# COMPREHENSIVE DUPLICATE CLEANUP PLAN

## CRITICAL FINDINGS
- **810 total API calls** across frontend (massive duplication)
- **203 backend endpoints** with **0 duplicates** (backend is clean)
- **151 frontend calls missing backend endpoints** (many are duplicates)
- **23 different cart-related components/hooks**
- **Multiple cart implementations** causing conflicts

## MAJOR DUPLICATES IDENTIFIED

### 1. CART OPERATIONS (Most Critical)
Files with duplicate cart mutations:
- `client/src/components/products/ProductDetailModal.tsx` - addToCartMutation
- `client/src/components/products/ProductGrid.tsx` - addToCartMutation  
- `client/src/components/cart/AiSuggestionsPanel.tsx` - addToCartMutation
- `client/src/components/cart/WishlistManager.tsx` - addToCartMutation
- `client/src/components/cart/EnhancedCartPopup.tsx` - updateQuantityMutation, removeItemMutation
- `client/src/hooks/simpleCart.ts` - cart operations
- `client/src/hooks/useCart.tsx` - cart operations
- `client/src/hooks/useSimpleCart.tsx` - cart operations

### 2. MULTIPLE CART IMPLEMENTATIONS
- `useCart.tsx` - legacy cart hook
- `simpleCart.ts` - simplified cart hook
- `useSimpleCart.tsx` - another cart hook
- `offlineCartManager.ts` - offline cart manager
- `cart.ts` - cart utilities
- Multiple cart pages and components

### 3. TYPE DEFINITIONS
- Product interface defined in 10+ files
- CartItem interface defined in 10+ files  
- Multiple conflicting type definitions

### 4. API REGISTRY SYSTEMS
- `shared/api-types.ts` - centralized types (good)
- `shared/types.ts` - duplicate types (just created)
- Multiple component-level type definitions

## CLEANUP STRATEGY

### Phase 1: Consolidate Cart Operations
1. ✅ Created `unified-api-registry.ts` with single cart implementation
2. Replace all cart mutations with unified registry
3. Remove duplicate cart hooks and components
4. Update all components to use unified cart

### Phase 2: Remove Duplicate Type Definitions
1. Remove `shared/types.ts` (duplicate of existing system)
2. Update all components to import from `shared/api-types.ts`
3. Remove local interface definitions

### Phase 3: Clean Up Unused Files
1. Remove obsolete cart implementations
2. Remove duplicate cart pages
3. Remove unused components and hooks

### Phase 4: Update Component Imports
1. Replace all individual mutations with unified registry
2. Update import statements
3. Test functionality

## PROGRESS STATUS

### COMPLETED ✅
1. ✅ Removed duplicate `shared/types.ts` file 
2. ✅ Created unified-api-registry.ts with consolidated cart, wishlist, draft orders, and AI suggestions
3. ✅ Replaced duplicate cart mutations in ProductDetailModal.tsx
4. ✅ Replaced duplicate cart mutations in ProductGrid.tsx  
5. ✅ Updated AiSuggestionsPanel.tsx to use unified registry
6. ✅ Started updating WishlistManager.tsx to use unified registry

### IN PROGRESS 🔄
- Completing WishlistManager.tsx consolidation
- Fixing remaining duplicate mutations in cart components
- Removing obsolete cart hooks (useSimpleCart, useCart, etc.)

### NEXT STEPS
1. Complete WishlistManager.tsx updates
2. Update remaining cart components to use unified registry
3. Remove obsolete cart implementation files
4. Test all functionality to ensure no regressions
5. Clean up unused imports and dead code

### IMPACT SO FAR
- **810 API calls** → Currently reducing (in progress)
- **Multiple cart systems** → Consolidating to single unified registry
- **Duplicate mutations** → Replacing with unified hooks
- **Type definitions** → Using existing centralized system

### REMAINING DUPLICATES TO CLEAN UP
- client/src/hooks/useSimpleCart.tsx
- client/src/hooks/useCart.tsx  
- client/src/hooks/simpleCart.ts
- client/src/lib/offlineCartManager.ts
- Multiple cart page components