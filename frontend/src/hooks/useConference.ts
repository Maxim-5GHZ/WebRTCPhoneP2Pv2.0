import { useState, useEffect, useRef } from 'react';
import { useSocket } from './useSocket';
import { WebRtcPeer } from 'kurento-utils';
import { useAuthContext } from "./useAuth.ts";

interface Participant {
    id: string;
    name: string;
    stream?: MediaStream;
    rtcPeer?: WebRtcPeer;
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

        const onNewParticipant = (request: any) => {
            receiveVideo(request.name);
        };
        
        const onExistingParticipants = (message: any) => {
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
                onicecandidate: (candidate: any) => onIceCandidate(sender, candidate),
                onaddstream: (event: any) => {
                    setParticipants(prev => ({
                        ...prev,
                        [sender]: {
                            ...prev[sender],
                            stream: event.stream,
                        }
                    }));
                }
            }
            
            const newRtcPeer = new WebRtcPeer.WebRtcPeerRecvonly(options, function(error) {
                if(error) return console.error(error);
                this.generateOffer((error: any, offerSdp: any) => {
                    if(error) return console.error(error);
                    const message = {
                        id: 'receiveVideoFrom',
                        sender: sender,
                        sdpOffer: offerSdp
                    };
                    socket.send(JSON.stringify(message));
                });
            });

            setParticipants(prev => ({...prev, [sender]: { ...participant, rtcPeer: newRtcPeer }}));
        };

        const onIceCandidate = (sender: string, candidate: any) => {
            const message = {
                id: 'onIceCandidate',
                name: sender,
                candidate: candidate,
            };
            socket.send(JSON.stringify(message));
        };

        const onParticipantLeft = (message: any) => {
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
        
        const onReceiveVideoAnswer = (message: any) => {
            participants[message.name]?.rtcPeer?.processAnswer(message.sdpAnswer, function (error) {
                if (error) return console.error(error);
            });
        }
        
        const iceCandidate = (message: any) => {
            participants[message.name]?.rtcPeer?.addIceCandidate(message.candidate, function(error) {
                if (error) {
                    console.error("Error adding candidate: " + error);
                    return;
                }
            });
        }


        const messageListener = (event: MessageEvent) => {
            const parsedMessage = JSON.parse(event.data);
            console.log('Received message: ', parsedMessage);

            switch (parsedMessage.id) {
                case 'existingParticipants':
                    onExistingParticipants(parsedMessage);
                    break;
                case 'newParticipantArrived':
                    onNewParticipant(parsedMessage);
                    break;
                case 'participantLeft':
                    onParticipantLeft(parsedMessage);
                    break;
                case 'receiveVideoAnswer':
                    onReceiveVideoAnswer(parsedMessage);
                    break;
                case 'iceCandidate':
                    iceCandidate(parsedMessage);
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
    }, [socket, user, roomName, myName]);

    return { participants };
};
