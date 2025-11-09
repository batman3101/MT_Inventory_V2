const Parts = () => {
  const parts = [
    { id: 1, name: 'Part A', description: 'Description for Part A', price: 10.00 },
    { id: 2, name: 'Part B', description: 'Description for Part B', price: 25.50 },
    { id: 3, name: 'Part C', description: 'Description for Part C', price: 5.75 },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Parts Management</h1>
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
              <th className="p-3">Description</th>
              <th className="p-3">Price</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {parts.map((part) => (
              <tr key={part.id} className="border-b">
                <td className="p-3">{part.name}</td>
                <td className="p-3">{part.description}</td>
                <td className="p-3">${part.price.toFixed(2)}</td>
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

export default Parts;