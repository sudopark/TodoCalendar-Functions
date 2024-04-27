
const express = require('express');
const router = express.Router();
const { getFirestore, Filter } = require('firebase-admin/firestore');

const db = getFirestore();
const collectionRef = db.collection('event_times')

const TodoRepository = require('../../repositories/todoRepository');
const todoReposiotry = new TodoRepository()

const SettingRepository = require('../../repositories/appSettingRepository');
const settingRepository = new SettingRepository();

const { chunk } = require('../../Utils/functions')
const Errors = require('../../models/Errors');

router.get('/', (req, res) => {
    res.status(200)
     .send({ path: '/' })
})

router.get('/path', (req, res) => {
    res.status(200)
        .send({ path: '/path' })
});

router.get('/path/:id', (req, res) => {
    res.status(200)
        .send({ path: `/path/${req.params.id}` })
});

router.get('/path/:id/sub', (req, res) => {
    res.status(200)
        .send({ path: `/path/${req.params.id}/sub` })
});
     
router.get('/current/todos', async (req, res) => {
    try {
        const todos = await todoReposiotry.findCurrentTodos('some')
        res.status(200)
            .send(todos)
    } catch(error) {
        res.status(500)
            .send({message: 'failed', origin: error})
    }
});

router.get('/todos', async (req, res) => {
    try {
        const ids = ['CnsqQCwyJ3PaYN1Pz3j2', 'ePuwGaTdg2Qle4u24w9a']
        const todos = await todoReposiotry.findTodos(ids)
        res.status(200)
            .send(todos)
    } catch (error) {
        res.status(500)
            .send({message: 'failed', origin: error})
    }
})

router.get('/chunk', async (req, res) => {
    const ids = [...Array(100).keys()]
    const slices = chunk(ids, 30)
    const result = {
        origin: ids, 
        slices: slices
    }
    res.status(200)
        .send(result)
});

router.get('/queries/origin2', async (req, res) => {
    try {
        const lower = Number(req.query.lower), upper = Number(req.query.upper);        
        const query = collectionRef
                .where('userId', '==', 'some')
                .where(
                    Filter.and(
                        Filter.or(
                            Filter.where('lower', '>=', lower), 
                            Filter.where('upper', '>=', lower), 
                            Filter.where('no_endtime', '==', true)
                        ), 
                        Filter.or(
                            Filter.where('lower', '<', upper), 
                            Filter.where('upper', '<', upper)
                        )
                    )                   
                )
        const snapshot = await query.get();
        const ids = snapshot.docs.map(doc => doc.id);
        res.status(200)
            .send(ids)
    } catch (error) {
        console.log(error);
        res.status(500)
            .send({message: 'failed', origin: error})
    }
});

router.get('/queries/null_test', async (req, res) => {
    try {
        // const lower = Number(req.query.lower), upper = Number(req.query.upper);        
        const query = collectionRef
                .where('userId', '==', 'some')
                .where('no_endtime', '==', true)
        const snapshot = await query.get();
        const ids = snapshot.docs.map(doc => doc.id);
        res.status(200)
            .send(ids)
    } catch (error) {
        console.log(error);
        res.status(500)
            .send({message: 'failed', origin: error})
    }
});

router.get('/tag/colors', async (req, res) => {
    try {
        const color = await settingRepository.userDefaultEventTagColors('some')
        res.status(200)
            .send(color)
    } catch (error) {
        res.status(500)
            .send(error)
    }
});


router.get('/throwing', async (req, res) => {
    const errorType = req.query.type
    switch(errorType) {
        case 'base':
            throw new Errors.Base(401, 'customCode', 'base error error message');
        case 'badReq':
            throw new Errors.BadRequest("bad request..")
        case 'notFound':
            throw new Errors.NotFound("not exits");
        case 'application': 
            throw new Errors.Application({status: 400, code: 'app_code', message: 'some message'})
        default:
            throw new Errors.Application({})
    }
});

module.exports = router;