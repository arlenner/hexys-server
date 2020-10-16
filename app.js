const express   = require('express')
const http      = require('http')
const socketIO  = require('socket.io')

const port = process.env.PORT || 5000
const index = require('./routes/index')
const loadMap = require('./utils/loadMap')
const reducer = require('./gameReducer')
const checkIsGameOver = require('./isGameOver')
const Player = require('./player')

const app = express()
app.use(index)

const server = http.createServer(app)

const io = socketIO(server)

const LOBBY = (() => {
    const game_list = []
    let lastID = 0

    const createHalf = (player, team) => {
        return { ...GAME_MODEL, cells: loadMap(), team, socketID: player.id, name: player.name }
    }

    const findGame = player => {
        let result
        let maybe_game = game_list.find(g => g.game[1] === null)        
        if(maybe_game === undefined) result = registerGame(createHalf(player, 'cell'))
        else {
            let [host, client] = maybe_game.game
            result = maybe_game.id
            client = maybe_game.game[1] = createHalf(player, 'bacteria')
            maybe_game.game[1].opponentName = maybe_game.game[0].name
            maybe_game.game[0].opponentName = maybe_game.game[1].name
            io.to(host.socketID)
              .emit('found-game', host)
            io.to(client.socketID)
              .emit('found-game', client)
        }
        return result
    }
    const registerGame = hostModel => {
        const result = { id: lastID++, game: [hostModel, null] }
        game_list.push(result)
        io.emit('update-lobby', all())
        return result.id
    }

    const getGame = id => game_list.find(g => g.id === id)

    const updateGame = (game, id) => {
        let last_game = getGame(id)
        game_list[game_list.indexOf(last_game)] = game
    }

    const deleteGame = id => (console.log(`deleting game ${id}`), game_list.splice(game_list.indexOf(game_list.find(g => g.id === id)), 1))
    
    const all = () => game_list

    return { registerGame, getGame, updateGame, deleteGame, all, findGame }
})()

const GAME_MODEL = {
    socketID: '',
    turn: 'cell',
    selected: null,
    runningMove: false,
    team: '',
    divs: [],
    jumps: [],
    cells: loadMap()
}

// SOCKET IO

io.on('connection', socket => {
    console.log('New client connection.')
    socket.emit('connected', LOBBY.all())
    let ID

    socket.on('disconnect', () => {
        console.log('Client disconnected.')
        if(LOBBY.getGame(ID)) LOBBY.deleteGame(ID)
    })

    socket.on('action', action => {
        LOBBY.updateGame(reducer(LOBBY.getGame(ID), action), ID)
        const [host, client] = LOBBY.getGame(ID).game

        io.to(host.socketID).emit('update', host)
        io.to(client.socketID).emit('update', client)

        if(checkIsGameOver(io, LOBBY.getGame(ID))) {
            if(LOBBY.getGame(ID)) LOBBY.deleteGame(ID)
        }
    })

    socket.on('find-new-game', ({id, name}) => {
        const me = new Player(id, name)
        socket.emit('finding-game')
        ID = LOBBY.findGame(me)
    })
})

// CONNECT

server.listen(port, () => console.log('listening on port ' + port))

