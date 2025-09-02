export async function generateMockPreview() {
  // Mock AR preview data
  return {
    modelUrl: "https://cdn.uinova.com/mock-model.glb",
    markers: [
      { id: "1", x: 0, y: 0, z: 0 },
      { id: "2", x: 1, y: 1, z: 1 },
    ],
  };
}
