package services.webrtc;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import org.kurento.client.Continuation;
import org.kurento.client.MediaPipeline;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.socket.WebSocketSession;

import java.io.Closeable;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

public class Room implements Closeable {
    private final Logger log = LoggerFactory.getLogger(Room.class);

    private final ConcurrentMap<String, UserSession> participants = new ConcurrentHashMap<>();
    private final MediaPipeline pipeline;
    private final String name;

    public String getName() {
        return name;
    }

    public Room(String name, MediaPipeline pipeline) {
        this.name = name;
        this.pipeline = pipeline;
        log.info("ROOM {} has been created", name);
    }

    public UserSession join(String userName, WebSocketSession session, String sdpOffer) throws IOException {
        log.info("USER {}: trying to join room {}", userName, this.name);
        UserSession participant = new UserSession(userName, this.name, session, this.pipeline);
        String sdpAnswer = participant.start(sdpOffer);
        join(participant, sdpAnswer);
        participants.put(userName, participant);
        return participant;
    }


    public void leave(UserSession user) throws IOException {
        log.debug("USER {}: leaving room {}", user.getName(), this.name);
        this.removeParticipant(user.getName());
        user.close();
    }


    private Collection<UserSession> join(UserSession newParticipant, String sdpAnswer) throws IOException {
        final JsonObject newParticipantMsg = new JsonObject();
        newParticipantMsg.addProperty("id", "newParticipantArrived");
        newParticipantMsg.addProperty("name", newParticipant.getName());

        final List<String> existingUsers = new ArrayList<>(this.participants.keySet());
        final JsonObject existingParticipantsMsg = new JsonObject();
        existingParticipantsMsg.addProperty("id", "existingParticipants");
        existingParticipantsMsg.addProperty("sdpAnswer", sdpAnswer);
        JsonArray array = new JsonArray();
        for (String user: existingUsers) {
            array.add(user);
        }
        existingParticipantsMsg.add("data", array);
        log.debug("USER {}: sending a list of {} participants", newParticipant.getName(),
                existingUsers.size());
        newParticipant.sendMessage(existingParticipantsMsg);

        log.debug("USER {}: notifying other {} participants", newParticipant.getName(),
                existingUsers.size());
        for (final UserSession user : this.participants.values()) {
            log.debug("USER {}: notifying {}", newParticipant.getName(), user.getName());
            user.sendMessage(newParticipantMsg);
        }


        return participants.values();
    }


    @Override
    public void close() {
        for (final UserSession user : participants.values()) {
            try {
                user.close();
            } catch (IOException e) {
                log.debug("ROOM {}: Could not invoke close on participant {}", this.name, user.getName(),
                        e);
            }
        }

        participants.clear();

        pipeline.release(new Continuation<Void>() {

            @Override
            public void onSuccess(Void result) throws Exception {
                log.trace("ROOM {}: Released Pipeline", Room.this.name);
            }

            @Override
            public void onError(Throwable cause) throws Exception {
                log.warn("PARTICIPANT {}: Could not release Pipeline", Room.this.name);
            }
        });

        log.debug("Room {} closed", this.name);
    }

    public Collection<UserSession> getParticipants() {
        return participants.values();
    }
    private void removeParticipant(String name) throws IOException {
        participants.remove(name);

        log.debug("ROOM {}: notifying all users that {} is leaving", this.name, name);

        final List<String> unnotifiedParticipants = new ArrayList<>();
        final JsonObject participantLeftJson = new JsonObject();
        participantLeftJson.addProperty("id", "participantLeft");
        participantLeftJson.addProperty("name", name);
        for (final UserSession participant : participants.values()) {
            try {
                participant.cancelVideoFrom(name);
                participant.sendMessage(participantLeftJson);
            } catch (final IOException e) {
                unnotifiedParticipants.add(participant.getName());
            }
        }

        if (!unnotifiedParticipants.isEmpty()) {
            log.debug("ROOM {}: The users {} could not be notified that {} left", this.name,
                    unnotifiedParticipants, name);
        }

    }
}