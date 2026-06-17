export const formatDateTimeIST = (value: any) => {
  if (!value) return ""
  const date = new Date(value)
  if (isNaN(date.getTime())) return String(value)
  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
}

export const formatDateTime = (value: any) => {
  if (!value) return ""
  const date = new Date(value)
  if (isNaN(date.getTime())) return String(value)
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
}
