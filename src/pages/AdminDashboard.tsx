import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DollarSign,
  FolderPlus,
  Package,
  Pencil,
  Plus,
  ShoppingCart,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { OrderStatusBadge } from '../components/common/OrderStatusBadge.tsx';
import { ProductImage } from '../components/common/ProductImage.tsx';
import { Button } from '../components/ui/button.tsx';
import { Checkbox } from '../components/ui/checkbox.tsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog.tsx';
import { Input } from '../components/ui/input.tsx';
import { Label } from '../components/ui/label.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select.tsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs.tsx';
import { orderService } from '../services/orderService.ts';
import { productService } from '../services/productService.ts';
import { AdminCustomer, Order, Product } from '../types/index.ts';
import { formatCurrency, formatDate, formatDateTime } from '../utils/format.ts';

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const [productSearch, setProductSearch] = useState('');

  // Product modal state
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [prodForm, setProdForm] = useState({
    name: '',
    description: '',
    unit: '1 unit',
    price: '',
    originalPrice: '',
    categoryId: '',
    imageUrl: '/src/assets/images/prod_fruits_orchard_1794931468680.jpg',
    stock: '25',
    isFeatured: false,
  });
  const [uploadingImg, setUploadingImg] = useState(false);

  // Category modal state
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [catForm, setCatForm] = useState({
    name: '',
    description: '',
    imageUrl: '/src/assets/images/prod_pantry_staples_1794931471147.jpg',
  });

  // Order detail & customer orders modals
  const [inspectOrder, setInspectOrder] = useState<Order | null>(null);
  const [inspectCustomer, setInspectCustomer] = useState<AdminCustomer | null>(null);

  const { data: statsData } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => orderService.getAdminStats(),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => productService.getCategories(),
  });

  const { data: productsData } = useQuery({
    queryKey: ['admin-products', productSearch],
    queryFn: () =>
      productService.getProducts({
        search: productSearch || undefined,
        limit: 100,
        sort: 'newest',
      }),
  });

  const { data: allOrders = [] } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: () => orderService.getAdminOrders(),
  });

  const { data: customers = [] } = useQuery({
    queryKey: ['admin-customers'],
    queryFn: () => orderService.getAdminCustomers(),
  });

  const { data: customerOrders = [] } = useQuery({
    queryKey: ['admin-customer-orders', inspectCustomer?.id],
    queryFn: () => orderService.getAdminCustomerOrders(inspectCustomer!.id),
    enabled: Boolean(inspectCustomer?.id),
  });

  const openNewProduct = () => {
    setEditingProduct(null);
    setProdForm({
      name: '',
      description: '',
      unit: '1 unit',
      price: '',
      originalPrice: '',
      categoryId: String(categories[0]?.id || 1),
      imageUrl: '/src/assets/images/prod_fruits_orchard_1794931468680.jpg',
      stock: '25',
      isFeatured: false,
    });
    setProductModalOpen(true);
  };

  const openEditProduct = (p: Product) => {
    setEditingProduct(p);
    setProdForm({
      name: p.name,
      description: p.description,
      unit: p.unit,
      price: p.price,
      originalPrice: p.originalPrice || '',
      categoryId: String(p.categoryId),
      imageUrl: p.imageUrl,
      stock: String(p.stock),
      isFeatured: p.isFeatured,
    });
    setProductModalOpen(true);
  };

  const handleImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const uploadedUrl = await orderService.uploadProductImage(dataUrl, file.name);
      setProdForm((f) => ({ ...f, imageUrl: uploadedUrl }));
      toast.success('Image uploaded');
    } catch (err: any) {
      toast.error(err?.message || 'Image upload failed.');
    } finally {
      setUploadingImg(false);
    }
  };

  const saveProductMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: prodForm.name,
        description: prodForm.description,
        unit: prodForm.unit,
        price: Number(prodForm.price),
        originalPrice: prodForm.originalPrice
          ? Number(prodForm.originalPrice)
          : null,
        categoryId: Number(prodForm.categoryId),
        imageUrl: prodForm.imageUrl,
        stock: Number(prodForm.stock),
        isFeatured: prodForm.isFeatured,
      };
      if (editingProduct) {
        await orderService.updateProduct(editingProduct.id, payload);
      } else {
        await orderService.createProduct(payload);
      }
    },
    onSuccess: () => {
      toast.success(editingProduct ? 'Product updated' : 'Product added');
      setProductModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Could not save product.');
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: (id: number) => orderService.deleteProduct(id),
    onSuccess: () => {
      toast.success('Product deleted');
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to delete product.'),
  });

  const createCategoryMutation = useMutation({
    mutationFn: () => orderService.createCategory(catForm),
    onSuccess: () => {
      toast.success('Category added');
      setCatModalOpen(false);
      setCatForm({
        name: '',
        description: '',
        imageUrl: '/src/assets/images/prod_pantry_staples_1794931471147.jpg',
      });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: (err: any) => toast.error(err?.message || 'Failed to create category.'),
  });

  const updateOrderMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: { orderStatus?: string; paymentStatus?: string };
    }) => orderService.updateAdminOrderStatus(id, data),
    onSuccess: () => {
      toast.success('Order updated');
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (err: any) => toast.error(err?.message || 'Update failed.'),
  });

  const stats = statsData?.stats;
  const recentOrders = statsData?.recentOrders ?? [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-gray-900">
            Admin Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage FreshCart inventory, customer orders, pricing, and store analytics.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCatModalOpen(true)}>
            <FolderPlus className="h-4 w-4" />
            <span>Add Category</span>
          </Button>
          <Button size="sm" onClick={openNewProduct}>
            <Plus className="h-4 w-4" />
            <span>Add Product</span>
          </Button>
        </div>
      </div>

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between text-xs font-medium text-gray-500">
            <span>Total Revenue</span>
            <DollarSign className="h-4 w-4 text-[#16A34A]" />
          </div>
          <p className="font-mono-nums text-2xl font-bold text-gray-900 mt-2">
            {formatCurrency(stats?.totalRevenue || 0)}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between text-xs font-medium text-gray-500">
            <span>Total Orders</span>
            <ShoppingCart className="h-4 w-4 text-[#16A34A]" />
          </div>
          <p className="font-mono-nums text-2xl font-bold text-gray-900 mt-2">
            {stats?.totalOrders ?? 0}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between text-xs font-medium text-gray-500">
            <span>Pending Orders</span>
            <Package className="h-4 w-4 text-amber-600" />
          </div>
          <p className="font-mono-nums text-2xl font-bold text-gray-900 mt-2">
            {stats?.pendingOrders ?? 0}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between text-xs font-medium text-gray-500">
            <span>Total Products</span>
            <Package className="h-4 w-4 text-[#16A34A]" />
          </div>
          <p className="font-mono-nums text-2xl font-bold text-gray-900 mt-2">
            {stats?.totalProducts ?? 0}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-center justify-between text-xs font-medium text-gray-500">
            <span>Customers</span>
            <Users className="h-4 w-4 text-[#16A34A]" />
          </div>
          <p className="font-mono-nums text-2xl font-bold text-gray-900 mt-2">
            {stats?.totalCustomers ?? 0}
          </p>
        </div>
      </div>

      {/* Main Workspace Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="products">
            Products ({productsData?.products.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="orders">
            Orders ({allOrders.length})
          </TabsTrigger>
          <TabsTrigger value="customers">
            Customers ({customers.length})
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h2 className="font-display text-lg font-bold text-gray-900">
                Recent Orders
              </h2>
            </div>
            {recentOrders.length === 0 ? (
              <p className="p-8 text-center text-sm text-gray-500">
                No orders have been placed yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                    <tr>
                      <th className="px-5 py-3">Order ID</th>
                      <th className="px-5 py-3">Customer</th>
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Status</th>
                      <th className="px-5 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {recentOrders.map((o: any) => (
                      <tr key={o.id} className="hover:bg-gray-50/70">
                        <td className="px-5 py-3.5 font-mono-nums font-semibold text-gray-900">
                          {o.orderNumber}
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="font-medium text-gray-900">{o.customerName}</p>
                          <p className="text-xs text-gray-500">{o.customerEmail}</p>
                        </td>
                        <td className="px-5 py-3.5 text-gray-600">
                          {formatDate(o.createdAt)}
                        </td>
                        <td className="px-5 py-3.5">
                          <OrderStatusBadge status={o.orderStatus} />
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono-nums font-bold text-gray-900">
                          {formatCurrency(o.totalAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Products Management Tab */}
        <TabsContent value="products" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <Input
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Search inventory by name..."
              className="sm:w-80"
            />
            <Button onClick={openNewProduct}>
              <Plus className="h-4 w-4" />
              <span>New Product</span>
            </Button>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="px-5 py-3">Product</th>
                    <th className="px-5 py-3">Category</th>
                    <th className="px-5 py-3">Price</th>
                    <th className="px-5 py-3">Stock</th>
                    <th className="px-5 py-3">Featured</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(productsData?.products ?? []).map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/70">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-12 rounded-md overflow-hidden bg-gray-100 shrink-0">
                            <ProductImage
                              src={p.imageUrl}
                              alt={p.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{p.name}</p>
                            <p className="text-xs text-gray-500">{p.unit}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-600">{p.categoryName}</td>
                      <td className="px-5 py-3 font-mono-nums">
                        <span className="font-semibold text-gray-900">
                          {formatCurrency(p.price)}
                        </span>
                        {p.originalPrice && (
                          <span className="ml-1.5 text-xs text-gray-400 line-through">
                            {formatCurrency(p.originalPrice)}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 font-mono-nums">
                        <span
                          className={
                            p.stock <= 5
                              ? 'text-red-600 font-semibold'
                              : 'text-gray-800'
                          }
                        >
                          {p.stock}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs font-medium text-gray-600">
                        {p.isFeatured ? 'Featured' : 'Standard'}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            aria-label={`Edit ${p.name}`}
                            onClick={() => openEditProduct(p)}
                            className="p-2 text-gray-500 hover:text-[#16A34A] cursor-pointer"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Delete ${p.name}`}
                            onClick={() => deleteProductMutation.mutate(p.id)}
                            className="p-2 text-gray-400 hover:text-red-600 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Orders Management Tab */}
        <TabsContent value="orders">
          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="px-5 py-3">Order</th>
                    <th className="px-5 py-3">Customer</th>
                    <th className="px-5 py-3">Order Status</th>
                    <th className="px-5 py-3">Payment Status</th>
                    <th className="px-5 py-3 text-right">Total</th>
                    <th className="px-5 py-3 text-right">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {allOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50/70">
                      <td className="px-5 py-3.5">
                        <p className="font-mono-nums font-semibold text-gray-900">
                          {order.orderNumber}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDateTime(order.createdAt)}
                        </p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-gray-900">
                          {order.customerName}
                        </p>
                        <p className="text-xs text-gray-500">
                          {order.customerEmail}
                        </p>
                      </td>
                      <td className="px-5 py-3.5">
                        <Select
                          value={order.orderStatus}
                          onValueChange={(val) =>
                            updateOrderMutation.mutate({
                              id: order.id,
                              data: { orderStatus: val },
                            })
                          }
                        >
                          <SelectTrigger className="w-36 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="confirmed">Confirmed</SelectItem>
                            <SelectItem value="processing">Processing</SelectItem>
                            <SelectItem value="shipped">Shipped</SelectItem>
                            <SelectItem value="delivered">Delivered</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-5 py-3.5">
                        <Select
                          value={order.paymentStatus}
                          onValueChange={(val) =>
                            updateOrderMutation.mutate({
                              id: order.id,
                              data: { paymentStatus: val },
                            })
                          }
                        >
                          <SelectTrigger className="w-32 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                            <SelectItem value="failed">Failed</SelectItem>
                            <SelectItem value="refunded">Refunded</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono-nums font-bold text-gray-900">
                        {formatCurrency(order.totalAmount)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setInspectOrder(order)}
                        >
                          Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        {/* Customers Management Tab */}
        <TabsContent value="customers">
          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                  <tr>
                    <th className="px-5 py-3">Customer</th>
                    <th className="px-5 py-3">Role</th>
                    <th className="px-5 py-3">Verified</th>
                    <th className="px-5 py-3 font-mono-nums">Orders</th>
                    <th className="px-5 py-3 text-right">Total Spent</th>
                    <th className="px-5 py-3 text-right">History</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {customers.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50/70">
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-gray-900">{c.fullName}</p>
                        <p className="text-xs text-gray-500">{c.email}</p>
                      </td>
                      <td className="px-5 py-3.5 capitalize text-gray-700">
                        {c.role}
                      </td>
                      <td className="px-5 py-3.5 text-xs font-medium">
                        <span
                          className={
                            c.emailVerified ? 'text-[#15803D]' : 'text-amber-700'
                          }
                        >
                          {c.emailVerified ? 'Verified' : 'Pending'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono-nums text-gray-800">
                        {c.orderCount}
                      </td>
                      <td className="px-5 py-3.5 text-right font-mono-nums font-semibold text-gray-900">
                        {formatCurrency(c.totalSpent)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setInspectCustomer(c)}
                        >
                          Orders
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Add / Edit Product Dialog */}
      <Dialog open={productModalOpen} onOpenChange={setProductModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </DialogTitle>
            <DialogDescription>
              Configure product pricing, category, stock quantity, and product image.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveProductMutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="prod-name">Product Name</Label>
                <Input
                  id="prod-name"
                  required
                  value={prodForm.name}
                  onChange={(e) =>
                    setProdForm((f) => ({ ...f, name: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select
                  value={prodForm.categoryId}
                  onValueChange={(val) =>
                    setProdForm((f) => ({ ...f, categoryId: val }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={String(cat.id)}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prod-unit">Pack / Unit Size</Label>
                <Input
                  id="prod-unit"
                  required
                  value={prodForm.unit}
                  onChange={(e) =>
                    setProdForm((f) => ({ ...f, unit: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prod-price">Selling Price ($)</Label>
                <Input
                  id="prod-price"
                  type="number"
                  step="0.01"
                  required
                  value={prodForm.price}
                  onChange={(e) =>
                    setProdForm((f) => ({ ...f, price: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prod-orig">Original Price (Optional, for discount)</Label>
                <Input
                  id="prod-orig"
                  type="number"
                  step="0.01"
                  value={prodForm.originalPrice}
                  onChange={(e) =>
                    setProdForm((f) => ({ ...f, originalPrice: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="prod-stock">Stock Quantity</Label>
                <Input
                  id="prod-stock"
                  type="number"
                  required
                  value={prodForm.stock}
                  onChange={(e) =>
                    setProdForm((f) => ({ ...f, stock: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-1.5 flex items-end pb-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="prod-featured"
                    checked={prodForm.isFeatured}
                    onCheckedChange={(c) =>
                      setProdForm((f) => ({ ...f, isFeatured: Boolean(c) }))
                    }
                  />
                  <Label htmlFor="prod-featured" className="cursor-pointer">
                    Feature on Home Page
                  </Label>
                </div>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="prod-desc">Description</Label>
                <Input
                  id="prod-desc"
                  required
                  value={prodForm.description}
                  onChange={(e) =>
                    setProdForm((f) => ({ ...f, description: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>Product Image</Label>
                <div className="flex items-center gap-3">
                  <div className="h-14 w-16 rounded-lg overflow-hidden bg-gray-100 shrink-0 border border-gray-200">
                    <ProductImage
                      src={prodForm.imageUrl}
                      alt={prodForm.name || 'Preview'}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <Input
                    value={prodForm.imageUrl}
                    onChange={(e) =>
                      setProdForm((f) => ({ ...f, imageUrl: e.target.value }))
                    }
                    placeholder="/src/assets/images/..."
                  />
                  <label className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer shrink-0">
                    <Upload className="h-3.5 w-3.5" />
                    <span>{uploadingImg ? 'Uploading...' : 'Upload'}</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={handleImageFile}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setProductModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saveProductMutation.isPending}>
                {saveProductMutation.isPending ? 'Saving...' : 'Save Product'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Category Dialog */}
      <Dialog open={catModalOpen} onOpenChange={setCatModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Grocery Category</DialogTitle>
            <DialogDescription>
              Create a new aisle category for grouping FreshCart products.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createCategoryMutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="cat-name">Category Name</Label>
              <Input
                id="cat-name"
                required
                value={catForm.name}
                onChange={(e) =>
                  setCatForm((c) => ({ ...c, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cat-desc">Description</Label>
              <Input
                id="cat-desc"
                required
                value={catForm.description}
                onChange={(e) =>
                  setCatForm((c) => ({ ...c, description: e.target.value }))
                }
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCatModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createCategoryMutation.isPending}>
                Create Category
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Admin Inspect Order Dialog */}
      <Dialog
        open={Boolean(inspectOrder)}
        onOpenChange={(o) => !o && setInspectOrder(null)}
      >
        <DialogContent className="max-w-xl">
          {inspectOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="font-mono-nums">
                  {inspectOrder.orderNumber}
                </DialogTitle>
                <DialogDescription>
                  Customer: {inspectOrder.customerName} ({inspectOrder.customerEmail})
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div className="rounded-xl bg-gray-50 p-3.5">
                  <p className="font-semibold text-gray-900">Delivery Address</p>
                  <p className="text-gray-600 mt-0.5">
                    {inspectOrder.shippingAddress.houseNumber},{' '}
                    {inspectOrder.shippingAddress.streetAddress},{' '}
                    {inspectOrder.shippingAddress.city},{' '}
                    {inspectOrder.shippingAddress.state}{' '}
                    {inspectOrder.shippingAddress.postalCode}
                  </p>
                  <p className="text-gray-600">
                    Phone: {inspectOrder.shippingAddress.phone}
                  </p>
                </div>

                <div className="divide-y divide-gray-100 rounded-xl border border-gray-200">
                  {inspectOrder.items.map((it) => (
                    <div
                      key={it.id}
                      className="flex items-center justify-between p-3"
                    >
                      <span>
                        {it.productName} × {it.quantity}
                      </span>
                      <span className="font-mono-nums font-semibold">
                        {formatCurrency(it.subtotal)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Customer Orders History Dialog */}
      <Dialog
        open={Boolean(inspectCustomer)}
        onOpenChange={(o) => !o && setInspectCustomer(null)}
      >
        <DialogContent>
          {inspectCustomer && (
            <>
              <DialogHeader>
                <DialogTitle>{inspectCustomer.fullName}</DialogTitle>
                <DialogDescription>{inspectCustomer.email}</DialogDescription>
              </DialogHeader>
              {customerOrders.length === 0 ? (
                <p className="text-sm text-gray-500 py-4">
                  This customer has not placed any orders yet.
                </p>
              ) : (
                <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
                  {customerOrders.map((co) => (
                    <div
                      key={co.id}
                      className="py-3 flex items-center justify-between text-sm"
                    >
                      <div>
                        <p className="font-mono-nums font-semibold text-gray-900">
                          {co.orderNumber}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(co.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono-nums font-bold">
                          {formatCurrency(co.totalAmount)}
                        </p>
                        <OrderStatusBadge status={co.orderStatus} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
