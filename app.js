const express   = require('express')
const http      = require('http')
const socketIO  = require('socket.io')

const port = process.env.PORT || 5000
const index = require('./routes/index')
const loadMap = require('./utils/loadMap')
const reducer = require('./gameReducer')
const checkIsGameOver = require('./isGameOver')

const app = express()
app.use(index)

const server = http.createServer(app)

const io = socketIO(server)

const LOBBY = (() => {
    const game_list = []
    let lastID = 0

    const createHalf = (id, team) => {
        return { ...GAME_MODEL, cells: loadMap(), team, socketID: id }
    }

    const findGame = socket => {
        let result
        let maybe_game = game_list.find(g => g.game[1] === null)        
        if(maybe_game === undefined) result = registerGame(createHalf(socket.id, 'cell'))
        else {
            let [host, client] = maybe_game.game
            result = maybe_game.id
            maybe_game.game[1] = createHalf(socket.id, 'bacteria')
            io.to(host.socketID)
              .emit('found-game', host)
            io.to(client.socketID)
              .emit('found-game', client)
        }
        return result
    }
    const registerGame = host => {
        const result = { id: lastID++, game: [host, null] }
        game_list.push(result)
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
    socket.emit('finding-game')
    let ID = LOBBY.findGame(socket)

    console.log(ID)

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

    socket.on('find-new-game', _ => {
        socket.emit('finding-game')
        ID = LOBBY.findGame(socket)
    })
})

// CONNECT

server.listen(port, () => console.log('listening on port ' + port))

