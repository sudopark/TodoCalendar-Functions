import { auth } from '../firebase'

export const tokenProvider = {
  async getToken(): Promise<string> {
    const user = auth.currentUser
    if (!user) throw new Error('Not authenticated')
    return user.getIdToken()
  },
}
