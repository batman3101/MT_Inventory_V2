const Suppliers = () => {
  const suppliers = [
    { id: 1, name: 'Supplier A', contact: 'John Doe', phone: '123-456-7890' },
    { id: 2, name: 'Supplier B', contact: 'Jane Smith', phone: '098-765-4321' },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Suppliers</h1>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <input
            type="text"
            placeholder="Search suppliers..."
            className="border px-4 py-2 rounded-md"
          />
          <button className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">
            Add New Supplier
          </button>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-200">
              <th className="p-3">Supplier Name</th>
              <th className="p-3">Contact Person</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((supplier) => (
              <tr key={supplier.id} className="border-b">
                <td className="p-3">{supplier.name}</td>
                <td className="p-3">{supplier.contact}</td>
                <td className="p-3">{supplier.phone}</td>
                <td className="p-3">
                  <button className="text-blue-500 hover:underline mr-4">Edit</button>
                  <button className="text-red-500 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Suppliers;