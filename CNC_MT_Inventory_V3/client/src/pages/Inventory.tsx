const Inventory = () => {
  const inventoryItems = [
    { id: 1, name: 'Part A', quantity: 100, location: 'A-1' },
    { id: 2, name: 'Part B', quantity: 50, location: 'B-2' },
    { id: 3, name: 'Part C', quantity: 20, location: 'C-3' },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Inventory</h1>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
          <input
            type="text"
            placeholder="Search parts..."
            className="border px-4 py-2 rounded-md"
          />
          <button className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">
            Add New Part
          </button>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-200">
              <th className="p-3">Part Name</th>
              <th className="p-3">Quantity</th>
              <th className="p-3">Location</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {inventoryItems.map((item) => (
              <tr key={item.id} className="border-b">
                <td className="p-3">{item.name}</td>
                <td className="p-3">{item.quantity}</td>
                <td className="p-3">{item.location}</td>
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

export default Inventory;