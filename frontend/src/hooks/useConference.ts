import { useState, useEffect } from 'react';
import { useSocket } from './useSocket';
import { useAuthContext } from "./useAuth.ts";
import * as kurentoUtils from 'kurento-utils';
import {
    ConferenceMessage,
    ExistingParticipantsMessage, IceCandidateMessage,
    NewParticipantMessage,
    ParticipantLeftMessage, ReceiveVideoAnswerMessage
} from "../types/types.ts";

interface Participant {
    id: string;
    name: string;
    stream?: MediaStream;
    rtcPeer?: any;
}

export const useConference = (roomName: string) => {
    const { user } = useAuthContext();
    const { socket } = useSocket();
    const [participants, setParticipants] = useState<Record<string, Participant>>({});
    const myName = user?.username ?? 'guest';

    useEffect(() => {
        if (!socket || !user || !roomName) return;

        const joinRoom = () => {
            const message = {
                id: 'joinRoom',
                name: myName,
                room: roomName,
            };
            socket.send(JSON.stringify(message));
        };

        const onNewParticipant = (request: NewParticipantMessage) => {
            receiveVideo(request.name);
        };
        
        const onExistingParticipants = (message: ExistingParticipantsMessage) => {
            const newParticipants: Record<string, Participant> = {};
            for (const participant of message.data) {
                newParticipants[participant] = { id: participant, name: participant };
                receiveVideo(participant);
            }
            setParticipants(prev => ({...prev, ...newParticipants}));
        }
        
        const receiveVideo = (sender: string) => {
            const participant = { id: sender, name: sender };
            const options = {
                remoteVideo: undefined, // Will be handled dynamically
                onicecandidate: (candidate: RTCIceCandidate) => onIceCandidate(sender, candidate),
                onaddstream: (event: { stream: MediaStream }) => {
                    setParticipants(prev => ({
                        ...prev,
                        [sender]: {
                            ...prev[sender],
                            stream: event.stream,
                        }
                    }));
                }
            }
            
            const newRtcPeer = new kurentoUtils.WebRtcPeer.WebRtcPeerRecvonly(options, function(error) {
                if(error) return console.error(error);
                if ('generateOffer' in this && typeof this.generateOffer === 'function') {
                    this.generateOffer((error: string, offerSdp: string) => {
                        if (error) return console.error(error);
                        const message = {
                            id: 'receiveVideoFrom',
                            sender: sender,
                            sdpOffer: offerSdp
                        };
                        socket.send(JSON.stringify(message));
                    });
                }
            });

            setParticipants(prev => ({...prev, [sender]: { ...participant, rtcPeer: newRtcPeer }}));
        };

        const onIceCandidate = (sender: string, candidate: RTCIceCandidate) => {
            const message = {
                id: 'onIceCandidate',
                name: sender,
                candidate: candidate,
            };
            socket.send(JSON.stringify(message));
        };

        const onParticipantLeft = (message: ParticipantLeftMessage) => {
            const participant = participants[message.name];
            if (participant) {
                participant.rtcPeer?.dispose();
                setParticipants(prev => {
                    const newParts = {...prev};
                    delete newParts[message.name];
                    return newParts;
                });
            }
        };
        
        const onReceiveVideoAnswer = (message: ReceiveVideoAnswerMessage) => {
            participants[message.name]?.rtcPeer?.processAnswer(message.sdpAnswer, function (error) {
                if (error) return console.error(error);
            });
        }
        
        const iceCandidate = (message: IceCandidateMessage) => {
            participants[message.name]?.rtcPeer?.addIceCandidate(message.candidate, function(error) {
                if (error) {
                    console.error("Error adding candidate: " + error);
                    return;
                }
            });
        }


        const messageListener = (event: MessageEvent) => {
            const parsedMessage: ConferenceMessage = JSON.parse(event.data);
            console.log('Received message: ', parsedMessage);

            switch (parsedMessage.id) {
                case 'existingParticipants':
                    onExistingParticipants(parsedMessage as ExistingParticipantsMessage);
                    break;
                case 'newParticipantArrived':
                    onNewParticipant(parsedMessage as NewParticipantMessage);
                    break;
                case 'participantLeft':
                    onParticipantLeft(parsedMessage as ParticipantLeftMessage);
                    break;
                case 'receiveVideoAnswer':
                    onReceiveVideoAnswer(parsedMessage as ReceiveVideoAnswerMessage);
                    break;
                case 'iceCandidate':
                    iceCandidate(parsedMessage as IceCandidateMessage);
                    break;
                default:
                    console.error('Unrecognized message', parsedMessage);
            }
        };
        
        socket.addEventListener('message', messageListener);
        joinRoom();

        return () => {
            socket.removeEventListener('message', messageListener);
            // Leave room when component unmounts
            const message = {
                id: 'leaveRoom',
            };
            socket.send(JSON.stringify(message));

            Object.values(participants).forEach(p => p.rtcPeer?.dispose());
        };
    }, [socket, user, roomName, myName, participants]);

    return { participants };
};
