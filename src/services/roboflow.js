const ROBOFLOW_API_KEY = import.meta.env.VITE_ROBOFLOW_API_KEY;
const ROBOFLOW_BASE = "https://detect.roboflow.com";

export async function runRoboflow(model, imageFile) {
  const formData = new FormData();
  formData.append("file", imageFile);

  const response = await fetch(
    `${ROBOFLOW_BASE}/${model}?api_key=${ROBOFLOW_API_KEY}`,
    {
      method: "POST",
      body: formData
    }
  );

  if (!response.ok) {
    throw new Error("Roboflow API error");
  }

  return response.json();
}
