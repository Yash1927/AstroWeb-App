export class CallApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export const callApi = {
  async getIceServers(bookingId: string) {
    const response = await fetch(`/api/calls/${encodeURIComponent(bookingId)}/ice-servers`, {
      credentials: 'include',
    })
    const body = (await response.json().catch(() => ({}))) as {
      error?: string
      iceServers?: RTCIceServer[]
    }
    if (!response.ok || !body.iceServers) {
      throw new CallApiError(
        body.error ?? 'Call audio is unavailable. Please try again.',
        response.status,
      )
    }
    return body.iceServers
  },
}
