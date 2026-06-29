export interface ContactUsPayload {
  first_name: string;
  last_name: string;
  email: string;
  phone_no: string;
  message: string;
}

export const submitContactUs = async (payload: ContactUsPayload) => {
  const res = await fetch("/api/contact-us-api", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok || data.status !== "OK") {
    throw new Error(data?.message || "Failed to send message");
  }

  return data;
};
