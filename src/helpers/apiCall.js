/* global fetch */

export default async ({ uri, method, headers, body, token, json }) => {
  headers = headers || { 'Content-Type': 'application/json' }
  method = method || 'get'
  body = body ? JSON.stringify(body) : null
  json = typeof json === 'undefined' ? true : Boolean(json)

  if (token) headers.Authorization = `Bearer ${token}`
  // console.log(uri, method, headers, body, token)

  const result = fetch(uri, { method, headers, body })
  const status = (await result).status
  const statusText = (await result).statusText

  if (status !== 200) throw new Error(statusText)

  const data = json ? (await result).json() : (await result).text()
  return data
}
