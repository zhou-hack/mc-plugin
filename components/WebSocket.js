import { WebSocketServer, WebSocket } from 'ws';
import Config from './Config.js';
import Init from '../model/init.js';
import sendMsg from './SendMsg.js';

class WebSocketCilent {
    constructor() {
        this.initWebSocket();
        this.connections = {}
    }

    async connectWebSocket(serverConfig, attempts = 0) {

        const ws = new WebSocket(serverConfig.ws_url, {
            headers: {
                'x-self-name': encodeURIComponent(serverConfig.server_name),
                'Authorization': encodeURIComponent(serverConfig.ws_password)
            }
        });

        ws.on('open', () => {
            logger.mark(
                logger.blue('[Minecraft WebSocket] ') +
                logger.green(serverConfig.server_name) +
                ' 已连接至 WebSocket 服务器'
            );
        });

        ws.on('message', (message) => {
            logger.mark(
                logger.blue('[Minecraft WebSocket] ') +
                logger.green(serverConfig.server_name) +
                ' 收到消息：' +
                logger.green(message)
            );
            sendMsg(message);
        });

        ws.on('close', () => {
            logger.mark(
                logger.blue('[Minecraft WebSocket] ') +
                logger.yellow(serverConfig.server_name) +
                ' 与 WebSocket 服务器断开连接'
            );
            if (attempts >= serverConfig.ws_max_attempts) {
                logger.mark(
                    logger.blue('[Minecraft WebSocket] ') +
                    logger.red(serverConfig.server_name) +
                    ' 与 WebSocket 服务器断开连接，已达最大重连次数，请检查 WebSocket 服务器是否正常运行'
                );
            } else {
                logger.mark(
                    logger.blue('[Minecraft WebSocket] ') +
                    logger.yellow(serverConfig.server_name) +
                    '  连接已断开，正在重连...'
                );
                setTimeout(() => {
                    this.connectWebSocket(serverConfig, attempts + 1);
                }, 5000);
            }
        });

        ws.on('error', (error) => {
            logger.mark(
                logger.blue('[Minecraft WebSocket] ') +
                logger.red(serverConfig.server_name) +
                ' 与 WebSocket 服务器发生错误：' +
                logger.red(error)
            );
        });

        this.connections[serverConfig.server_name] = ws;
    }

    async initWebSocket() {
        try {
            let config = await Config.getConfig();

            Init.initConfig();

            const wss = new WebSocketServer({
                port: config.mc_qq_ws_port,
                path: config.mc_qq_ws_url,
            });

            wss.on('listening', () => {
                logger.mark(
                    logger.blue('[Minecraft WebSocket]') +
                    ' 连接地址：' +
                    logger.green(`ws://localhost:${config.mc_qq_ws_port}${config.mc_qq_ws_url}`)
                );
            });

            config.mc_qq_server_list.forEach(serverConfig => {
                if (serverConfig.ws_able) {
                    this.connectWebSocket(serverConfig);
                }
            });

            wss.on('connection', (ws, request) => {
                const serverName = JSON.parse(request.headers['x-self-name']);
                serverName = decodeURIComponent(serverName);
                const serverToken = JSON.parse(request.headers['Authorization']);
                serverToken = decodeURIComponent(serverToken);
                serverToken.replace(/^Bearer /, '');

                if (serverToken !== config.mc_qq_ws_password) {
                    ws.close(1000, 'Invalid token');
                    logger.mark(
                        logger.blue('[Minecraft WebSocket] ') +
                        logger.green(serverName) +
                        ' 尝试连接至 WebSocket 服务器，但提供的令牌无效，已拒绝连接'
                    )
                }

                if (this.connections[serverName]) {
                    ws.close(1000, 'Duplicate connection');
                    logger.mark(
                        logger.blue('[Minecraft WebSocket] ') +
                        logger.green(serverName) +
                        ' 尝试连接至 WebSocket 服务器，但出现同名服务器，已拒绝连接'
                    )
                }

                logger.mark(
                    logger.blue('[Minecraft WebSocket] ') +
                    logger.green(serverName) +
                    ' 已连接至 WebSocket 服务器'
                );
                this.connections[serverName] = ws;

                ws.on('message', (message) => {
                    if (config.debug_mode) {
                        logger.mark(
                            logger.blue('[Minecraft WebSocket] ') +
                            logger.green(serverName) +
                            ' 收到消息：' + message
                        );
                    }
                    sendMsg(message)
                });

                ws.on('close', () => {
                    logger.mark(
                        logger.blue('[Minecraft WebSocket] ') +
                        logger.yellow(serverName) +
                        ' 已断开与 WebSocket 服务器的连接'
                    );

                    delete this.connections[serverName];
                });
            });

        } catch (error) {
            logger.error(error);
            throw error;
        }
    }
}

export default new WebSocketCilent();