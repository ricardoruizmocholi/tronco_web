import api from '../lib/axios'

export async function uploadImage(file: File): Promise<string> {
  const form = new FormData()
  form.append('image', file)
  const res = await api.post<{ url: string }>('/api/upload-image', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data.url
}

export async function uploadVideo(file: File): Promise<string> {
  const form = new FormData()
  form.append('video', file)
  const res = await api.post<{ url: string }>('/api/admin/upload-video', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data.url
}
