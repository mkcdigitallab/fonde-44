export async function customerApi(path, { method = "GET", body } = {}) {
  const options = {
    method,
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
    },
  };

  if (body !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(path, options);
    const data = await response.json().catch(() => null);
    return {
      ok: response.ok,
      status: response.status,
      data,
      error: data?.error || null,
    };
  } catch {
    return {
      ok: false,
      status: 0,
      data: null,
      error: "network_error",
    };
  }
}
