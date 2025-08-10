
// MARKL - check result

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

class SyncCheckResponse {

    start = null;

    constructor(result) {
        this.result = result
    }

    setStart(start) {
        this.start = start
        return this
    }

    toJSON() {
        return {
            result: this.result.key, 
            start: this.start
        }
    }
}

// MARK: - response 
class SyncResponse {

    created = null;
    updated = null;
    deleted = null;
    nextPageCursor = null
    newSyncTime = null;

    constructor() { }

    setCreated(created) {
        this.created = created
    }

    setUpdated(updated) {
        this.updated = updated
    }

    setDeleted(deleted) {
        this.deleted = deleted
    }

    setSynctime(timestamp) {
        this.newSyncTime = timestamp
    }

    setNextPageCursor(cursor)  {
        this.nextPageCursor = cursor
    }

    toJSON() {
        return {
            created: this.created, 
            updated: this.updated, 
            deleted: this.deleted, 
            newSyncTime: this.newSyncTime,
            nextPageCursor: this.nextPageCursor
        }
    }
}

module.exports = {
    CheckResult: SyncCheckResult, 
    CheckResponse: SyncCheckResponse,
    Response: SyncResponse
}