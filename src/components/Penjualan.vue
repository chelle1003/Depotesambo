<!-- Penjualan.vue -->

<script setup>
import { ref, watch, computed } from 'vue';
import axios from 'axios';
import { useToast } from 'vue-toastification';

const toast = useToast();

// Initialize reactive invoice items array
const invoiceItems = ref([{ id_produk: '', jumlah_produk: 1, harga: 0 }]);

// To store available products
const products = ref([]);
const jumlahStock = ref([]);

// Watch for changes in product selection and update price
watch(
  () => invoiceItems.value,
  () => {
    invoiceItems.value.forEach(async (item) => {
      if (item.id_produk) {
        const product = products.value.find(
          (p) => p.id_produk === item.id_produk
        );
        if (product) {
          item.harga = product.harga_jual || 0; // Set price from the selected product
        }
      }
    });
  },
  { deep: true }
);

// Computed property for total price of each item (harga * qty)
const itemTotalPrice = computed(() => {
  return invoiceItems.value.map((item) => ({
    ...item,
    total: item.harga * item.jumlah_produk,
  }));
});

// Computed property for total price
const totalPrice = computed(() =>
  invoiceItems.value.reduce(
    (sum, item) => sum + item.harga * item.jumlah_produk,
    0
  )
);

// Computed property for total price with tax
const totalWithTax = computed(() => {
  const tax = totalPrice.value * 0.10; // 11% tax
  return totalPrice.value + tax; // Adding tax to the subtotal
});

// Computed property for tax amount
const taxAmount = computed(() => {
  return totalPrice.value * 0.10; // 11% tax
});

// Add a new empty item to the table
function addItem() {
  invoiceItems.value.push({ id_produk: '', jumlah_produk: 1, harga: 0 });
}

// Remove an item from the table
function removeItem(index) {
  invoiceItems.value.splice(index, 1);
}

// Format currency for display
function formatCurrency(value) {
  if (value == null || isNaN(value)) {
    return '-'; // Return a placeholder if value is invalid
  }
  return value.toLocaleString('en-US', { style: 'currency', currency: 'IDR' });
}

// Validate stock before submitting the invoice
function validateStock(items) {
  for (const item of items) {
    const availableStock = jumlahStock.value[item.id_produk] || 0;
    if (item.jumlah_produk > availableStock) {
      toast.error(
        `Insufficient stock for product ${item.id_produk}. Available: ${availableStock}, Requested: ${item.jumlah_produk}`
      );
      return false; // Prevent submission
    }
  }
  return true; // Allow submission
}

// Fetch stock data from the new endpoint
async function fetchJumlahStock() {
  try {
    const response = await axios.get('/api/jumlah-stock');
    // Transform the response into a key-value map for quick lookups
    jumlahStock.value = response.data.reduce((acc, stock) => {
      acc[stock.id_produk] = stock.available_stock;
      return acc;
    }, {});
  } catch (error) {
    console.error('Error fetching stock data:', error);
    toast.error('Failed to fetch stock data. Please try again.');
  }
}

// Fetch products data from MySQL
async function fetchProducts() {
  try {
    const response = await axios.get('/api/products'); // Endpoint to fetch products
    products.value = response.data;
  } catch (error) {
    console.error('Error fetching products:', error);
    toast.error('Failed to fetch product data. Please refresh the page.');
  }
}

// Submit invoice to MySQL through the Express API
async function submitInvoice() {
  if (!validateStock(invoiceItems.value)) {
    return; // Stop submission if validation fails
  }

  // Proceed with the API request
  try {
    const invoiceData = {
      total_harga: totalPrice.value,
      tanggal: new Date().toISOString(),
      items: invoiceItems.value.map((item) => ({
        id_produk: item.id_produk,
        jumlah_produk: item.jumlah_produk,
        harga: item.harga,
      })),
    };

    const response = await axios.post('/api/penjualan', invoiceData);

    if (response.status === 201) {
      toast.success('Invoice submitted successfully!');
      resetForm();
      fetchJumlahStock(); // Refresh stock data after submission
    }
  } catch (error) {
    console.error('Error submitting invoice:', error);
    toast.error('Failed to submit invoice. Please try again.');
  }
}

// Fetch products when the component is mounted
fetchJumlahStock();
fetchProducts();

// Reset form fields
const resetForm = () => {
  invoiceItems.value = [{ id_produk: '', jumlah_produk: 1, harga: 0 }]; // Reset to initial state
};
</script>

<template>
  <div class="container mx-auto p-4">
    <h2 class="text-2xl font-semibold mb-4">POS System</h2>
    <table class="min-w-full border border-gray-200 rounded-lg overflow-hidden">
      <thead>
        <tr class="bg-gray-100">
          <th class="px-4 py-2 border-b">Product ID</th>
          <th class="px-4 py-2 border-b">Quantity</th>
          <th class="px-4 py-2 border-b">Price</th>
          <th class="px-4 py-2 border-b">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="(item, index) in invoiceItems"
          :key="index"
          class="hover:bg-gray-50"
        >
          <td class="px-4 py-2 border-b">
            <select v-model="item.id_produk" class="border rounded p-1 w-full">
              <option value="" disabled>Select Product</option>
              <option
                v-for="product in products"
                :key="product.id_produk"
                :value="product.id_produk"
              >
                {{ product.nama_produk }}
              </option>
            </select>
          </td>
          <td class="px-4 py-2 border-b">
            <input
              v-model.number="item.jumlah_produk"
              type="number"
              class="border rounded p-1 w-full"
              placeholder="Quantity"
            />
          </td>
          <td class="px-4 py-2 border-b">
            <!-- Display the price as non-editable -->
            <span class="border rounded p-1 w-full">{{
              formatCurrency(item.harga * item.jumlah_produk)
            }}</span>
          </td>
          <td class="px-4 py-2 border-b">
            <button
              @click="removeItem(index)"
              class="pi pi-trash flex text-red-800 hover:drop-shadow-lg hover:text-red-100"
            >
              Delete
            </button>
          </td>
        </tr>
      </tbody>
    </table>
    <div class="flex w-full justify-end">
      <button
        @click="addItem"
        class="mt-4 px-4 py-2 bg-secondary-500 text-white rounded"
      >
        Add Item
      </button>
    </div>

    <div class="flex justify-between items-center">
      <div class="text-xl font-heading space-y-2">
        <p class="">Sub Total: {{ formatCurrency(totalPrice) }}</p>
        <hr />
        <p class="text-base font-body">
          Pajak (10%): {{ formatCurrency(taxAmount) }}
        </p>
        <hr />
        <p>Total: {{ formatCurrency(totalWithTax) }}</p>
      </div>

      <div class="">
        <button
          @click="submitInvoice"
          class="mt-4 px-4 py-2 bg-primary-500 text-white rounded"
        >
          Submit Invoice
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
table {
  width: 100%;
}
th,
td {
  text-align: left;
  padding: 8px;
}
</style>
