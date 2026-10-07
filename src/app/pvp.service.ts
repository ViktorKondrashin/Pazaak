import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, push, onValue, update, remove, onDisconnect, get } from 'firebase/database';
import { environment } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class PvpService {
  private db;

  constructor() {
    const app = initializeApp(environment.firebaseConfig);
    this.db = getDatabase(app);
    console.log('Firebase инициализирован');
  }

  async createRoom(): Promise<string> {
    console.log('createRoom: создаю комнату...');
    const roomRef = push(ref(this.db, 'rooms'));
    const roomId = roomRef.key!;
    const roomData = {
      players: {
        player1: {
          id: this.generateId(),
          sum: 0,
          wins: 0,
          isStand: false
        }
      },
      currentTurn: 'player1',
      status: 'waiting', // waiting, playing, finished
      winner: null,
      createdAt: Date.now()
    };
    try {
      await set(roomRef, roomData);
      console.log('Комната создана, ID =', roomId);
      onDisconnect(roomRef).remove();
      return roomId;
    } catch (err) {
      console.error('Ошибка создания комнаты:', err);
      throw err;
    }
  }

  async joinRoom(roomId: string): Promise<boolean> {
    console.log('joinRoom: пробую комнату', roomId);
    const roomRef = ref(this.db, `rooms/${roomId}`);
    try {
      const snapshot = await get(roomRef);
      if (!snapshot.exists()) {
        console.log('Комната не существует');
        return false;
      }
      const room = snapshot.val();
      console.log('Текущие данные комнаты:', room);
      if (room.status !== 'waiting') {
        console.log('Комната не в статусе waiting');
        return false;
      }
      if (room.players.player2) {
        console.log('В комнате уже есть player2');
        return false;
      }
      await update(roomRef, {
        'players/player2': {
          id: this.generateId(),
          sum: 0,
          wins: 0,
          isStand: false
        },
        status: 'playing'
      });
      console.log('Успешно присоединился к', roomId);
      return true;
    } catch (err) {
      console.error('Ошибка joinRoom:', err);
      return false;
    }
  }

  listenRoom(roomId: string, callback: (data: any) => void) {
    const roomRef = ref(this.db, `rooms/${roomId}`);
    return onValue(roomRef, (snapshot) => callback(snapshot.val()));
  }

  async updatePlayer(roomId: string, player: 'player1' | 'player2', data: any) {
    await update(ref(this.db, `rooms/${roomId}/players/${player}`), data);
  }

  async setTurn(roomId: string, turn: 'player1' | 'player2') {
    await update(ref(this.db, `rooms/${roomId}`), { currentTurn: turn });
  }

  async finishGame(roomId: string, winner: 'player1' | 'player2') {
    await update(ref(this.db, `rooms/${roomId}`), { status: 'finished', winner });
  }

  async deleteRoom(roomId: string) {
    await remove(ref(this.db, `rooms/${roomId}`));
  }

  // ДОБАВЬТЕ ЭТОТ МЕТОД
  async getRoom(roomId: string): Promise<any> {
    const roomRef = ref(this.db, `rooms/${roomId}`);
    const snapshot = await get(roomRef);
    return snapshot.val();
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 9);
  }
}