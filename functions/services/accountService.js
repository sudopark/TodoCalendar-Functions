

class AccountService {

    constructor(accountRepository) {
        this.accountRepository = accountRepository
    }

    async putAccountInfo(auth) {

        try {
            const existingInfo = await this.accountRepository.findAccountInfo(auth.uid, auth.auth_time);
            if(existingInfo) {
                return existingInfo
            } else {
                const payload = {
                    email: auth.email, 
                    method: auth.firebase?.sign_in_provider, 
                    first_signed_in: auth.auth_time
                }
                const newInfo = await this.accountRepository.saveAccountInfo(auth.uid, payload)
                return newInfo
            }
        } catch (error) {
            throw error;
        }
    }

    async deleteAccount(auth) {
        await this.accountRepository.deleteAccountInfo(auth.uid);
        return { status: 'ok' }
    }
}

module.exports = AccountService;