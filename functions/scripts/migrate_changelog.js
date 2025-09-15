

// readline 인터페이스 설정
const readline = require('node:readline');
const rl = readline.createInterface({
    input: process.stdin, 
    output: process.stdout
})

function askQuestion(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

// setup firestore
const admin = require('firebase-admin');
const serviceAccount = require('../secrets/todocalendar-serviceAccountKey.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
})

// get firestore
const { getFirestore } = require('firebase-admin/firestore');
const { DataChangeCase, DataChangeLog } = require('../models/DataChangeLog');

const db = getFirestore();


// 대체 이벤트 싱크 시간 -> 고정: 1722470400000 (2024-08-01T00:00:00Z)
const fixedTimestamp = 1722470400000

// migrate event tag
async function batchUpdateEventTags() {

    // tag에 해당하는 모든 changeLog 조회
    const changeLogRef = db.collection('changeLogs_EventTag');
    const allLogs = await changeLogRef.get();
    // changeLog id set 
    const logIdSet = new Set(allLogs.docs.map(log => log.id))

    // 전체 tag 데이터를 조회해서
    const collectionRef = db.collection('event_tags')
    const allTagsSnapshot = await collectionRef.get();

    const logMissingTags = allTagsSnapshot.docs.filter(doc => {
        return !logIdSet.has(doc.id)
    })

    console.log(
        'change log가 없는 이벤트 태그 수', 
        logMissingTags.length, 
        '이름들: ', 
        logMissingTags.map(d => d.data().name)
    )

    const answer = await askQuestion('change log 마이그레이션을 진행할까요? (y/n): ')
    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        console.log('작업이 취소되었습니다.')
        return
    }

    const newLogs = logMissingTags.map(t => {
        const data = t.data(); const userId = data.userId;
        if(!userId) {
            console.log('❗️ userId가 없는 데이터가 존재합니다: ', data.name)
            process.exit();
        }
        return new DataChangeLog(t.id, userId, DataChangeCase.CREATED, fixedTimestamp)
    })

    const batch = db.batch();
    let updateCount = 0
    newLogs.forEach((log, _) => {
        const  { uuid, ...payload } = log.toJSON();
        const logRef = changeLogRef.doc(uuid);
        batch.set(logRef, payload)
        updateCount += 1
    })

    console.log(updateCount, '개의 데이터를 마이그레이션 합니다...');
    await batch.commit();
    console.log('마이그레이션이 완료 되었습니다.')
    process.exit();
}


// migrate todo
async function batchUpdateTodos() {

    // todo에 해당하는 모든 changeLog 조회
    const changeLogRef = db.collection('changeLogs_Todo');
    const allLogs = await changeLogRef.get();
    // changeLog id set 
    const logIdSet = new Set(allLogs.docs.map(log => log.id))

    // 전체 todo 데이터를 조회해서
    const collectionRef = db.collection('todos')
    const allTodosSnapshot = await collectionRef.get();

    const logMissingTodos = allTodosSnapshot.docs.filter(doc => {
        return !logIdSet.has(doc.id)
    })

    console.log(
        'change log가 없는 todo 수', 
        logMissingTodos.length, 
        '이름들: ', 
        logMissingTodos.map(d => d.data().name)
    )

    const answer = await askQuestion('change log 마이그레이션을 진행할까요? (y/n): ')
    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        console.log('작업이 취소되었습니다.')
        return
    }

    const newLogs = logMissingTodos.map(t => {
        const data = t.data(); const userId = data.userId;
        if(!userId) {
            console.log('❗️ userId가 없는 데이터가 존재합니다: ', data.name, t.id)
            process.exit();
        }
        return new DataChangeLog(t.id, userId, DataChangeCase.CREATED, fixedTimestamp)
    })

    const batch = db.batch();
    let updateCount = 0
    newLogs.forEach((log, _) => {
        const  { uuid, ...payload } = log.toJSON();
        const logRef = changeLogRef.doc(uuid);
        batch.set(logRef, payload)
        updateCount += 1
    })

    console.log(updateCount, '개의 데이터를 마이그레이션 합니다...');
    await batch.commit();
    console.log('마이그레이션이 완료 되었습니다.')
    process.exit();
}

// migrate schedule
async function batchUpdateSchedules() {

    // schedule에 해당하는 모든 changeLog 조회
    const changeLogRef = db.collection('changeLogs_Schedule');
    const allLogs = await changeLogRef.get();
    // changeLog id set 
    const logIdSet = new Set(allLogs.docs.map(log => log.id))

    // 전체 schedule 데이터를 조회해서
    const collectionRef = db.collection('schedules')
    const allSchedulesSnapshot = await collectionRef.get();

    const logMissingSchedules = allSchedulesSnapshot.docs.filter(doc => {
        return !logIdSet.has(doc.id)
    })

    console.log(
        'change log가 없는 schedule 수', 
        logMissingSchedules.length, 
        '이름들: ', 
        logMissingSchedules.map(d => d.data().name)
    )

    const answer = await askQuestion('change log 마이그레이션을 진행할까요? (y/n): ')
    if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
        console.log('작업이 취소되었습니다.')
        return
    }

    const newLogs = logMissingSchedules.map(t => {
        const data = t.data(); const userId = data.userId;
        if(!userId) {
            console.log('❗️ userId가 없는 데이터가 존재합니다: ', data.name, t.id)
            process.exit();
        }
        return new DataChangeLog(t.id, userId, DataChangeCase.CREATED, fixedTimestamp)
    })

    const batch = db.batch();
    let updateCount = 0
    newLogs.forEach((log, _) => {
        const  { uuid, ...payload } = log.toJSON();
        const logRef = changeLogRef.doc(uuid);
        batch.set(logRef, payload)
        updateCount += 1
    })

    console.log(updateCount, '개의 데이터를 마이그레이션 합니다...');
    await batch.commit();
    console.log('마이그레이션이 완료 되었습니다.')
    process.exit();
}

async function askMigrationEventType() {
    const eventType = await askQuestion('마이그레이션 할 대상을 선택하세요 (tag/todo/schedule): ')

    if (eventType === 'tag') {
        return batchUpdateEventTags()
    } else if (eventType === "todo")  {
        return batchUpdateTodos()
    } else if (eventType === 'schedule') {
        return batchUpdateSchedules()
    } else {
        console.log('지원하지 않는 데이터 타입입니다')
        rl.close();
    }
}

askMigrationEventType()
.catch(console.error)
.finally(() => {
    rl.close();
})