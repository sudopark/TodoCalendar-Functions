
class SyncCheckResult {
    constructor(key) {
        this.key = key
    }
}

SyncCheckResult.noNeedToSync = new SyncCheckResult('noNeedToSync');
SyncCheckResult.needToSync = new SyncCheckResult('needToSync');
SyncCheckResult.migrationNeeds = new SyncCheckResult('migrationNeeds');
Object.freeze(SyncCheckResult);
Object.freeze(SyncCheckResult.noNeedToSync);
Object.freeze(SyncCheckResult.needToSync);
Object.freeze(SyncCheckResult.migrationNeeds);

class SyncResponse {

    created = null;
    updated = null;
    deleted = null;
    checkResult;
    newSyncTime = null;

    constructor(checkResult) {
        this.checkResult = checkResult
    }

    setCreated(created) {
        this.created = created
        return this
    }

    setUpdated(updated) {
        this.updated = updated
        return this
    }

    setDeleted(deleted) {
        this.deleted = deleted
        return this
    }

    setSynctime(timestamp) {
        this.newSyncTime = timestamp
        return this
    }

    toJSON() {
        return {
            created: this.created, 
            updated: this.updated, 
            deleted: this.deleted, 
            checkResult: this.checkResult.key, 
            newSyncTime: JSON.stringify(this.newSyncTime)
        }
    }
}

SyncResponse.noNeedToSync = new SyncResponse(SyncCheckResult.noNeedToSync);
Object.freeze(SyncResponse.noNeedToSync)

module.exports = {
    CheckResult: SyncCheckResult, 
    Response: SyncResponse
}