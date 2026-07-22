package com.halenteck.demo.service;

import com.halenteck.demo.entity.ComparisonTaskEntity;
import com.halenteck.demo.entity.StudyEntity;
import com.halenteck.demo.entity.StudyInviteEntity;
import com.halenteck.demo.entity.UserEntity;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class NotificationService {

    private final JavaMailSender javaMailSender;

    public NotificationService(JavaMailSender javaMailSender) {
        this.javaMailSender = javaMailSender;
    }




    public void sendTaskAssignmentNotification(UserEntity participant, StudyEntity study, ComparisonTaskEntity task) {
        if (participant.getEmail() == null || participant.getEmail().isBlank()) {

            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom("codearena.noreply@gmail.com");
            message.setTo(participant.getEmail());
            message.setSubject("New Task Assigned: " + study.getTitle());

            String taskDescription = task.getDescription() != null && !task.getDescription().isBlank()
                    ? "\nTask Description: " + task.getDescription()
                    : "";

            String artifactInfo = "Artifact A: " + task.getArtifactA().getFileName();
            if (task.getArtifactB() != null) {
                artifactInfo += "\nArtifact B: " + task.getArtifactB().getFileName();
            }
            if (task.getArtifactC() != null) {
                artifactInfo += "\nArtifact C: " + task.getArtifactC().getFileName();
            }

            String deadlineInfo = "";
            if (study.getAccessWindowEnd() != null) {
                deadlineInfo = "\n\nDeadline: " + study.getAccessWindowEnd().toString();
            }

            message.setText("Hello " + participant.getName() + ",\n\n" +
                    "A new task has been assigned to you for the study: " + study.getTitle() + "\n\n" +
                    taskDescription +
                    "\n\n" + artifactInfo +
                    deadlineInfo +
                    "\n\nPlease log in to your dashboard to complete the task.\n\n" +
                    "Thank you,\nCodeArena Team");

            javaMailSender.send(message);
        } catch (Exception e) {

            System.err.println("Failed to send task assignment notification email: " + e.getMessage());
            e.printStackTrace();
        }
    }




    public void sendMultipleTasksAssignmentNotification(UserEntity participant, StudyEntity study, List<ComparisonTaskEntity> tasks) {
        if (participant.getEmail() == null || participant.getEmail().isBlank()) {
            return;
        }

        if (tasks.isEmpty()) {
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom("codearena.noreply@gmail.com");
            message.setTo(participant.getEmail());
            message.setSubject("New Tasks Assigned: " + study.getTitle());

            String deadlineInfo = "";
            if (study.getAccessWindowEnd() != null) {
                deadlineInfo = "\n\nDeadline: " + study.getAccessWindowEnd().toString();
            }

            String taskCount = tasks.size() == 1 ? "1 new task" : tasks.size() + " new tasks";

            message.setText("Hello " + participant.getName() + ",\n\n" +
                    taskCount + " have been assigned to you for the study: " + study.getTitle() +
                    deadlineInfo +
                    "\n\nPlease log in to your dashboard to complete the tasks.\n\n" +
                    "Thank you,\nCodeArena Team");

            javaMailSender.send(message);
        } catch (Exception e) {

            System.err.println("Failed to send multiple tasks assignment notification email: " + e.getMessage());
            e.printStackTrace();
        }
    }




    public void sendStudyInviteNotification(StudyInviteEntity invite, StudyEntity study, UserEntity invitedBy) {
        String recipientEmail = invite.getEmail();
        if (recipientEmail == null || recipientEmail.isBlank()) {

            return;
        }


        if (invite.getDeliveryMethod() != com.halenteck.demo.entity.StudyInviteDeliveryMethod.EMAIL) {
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom("codearena.noreply@gmail.com");
            message.setTo(recipientEmail);
            message.setSubject("Invitation to Participate: " + study.getTitle());

            String inviteLink = "http://localhost:5173/participant-dashboard?inviteToken=" + invite.getToken();

            String recipientName = invite.getInvitedUser() != null
                    ? invite.getInvitedUser().getName()
                    : recipientEmail.split("@")[0];

            String deadlineInfo = "";
            if (study.getAccessWindowEnd() != null) {
                deadlineInfo = "\n\nStudy Deadline: " + study.getAccessWindowEnd().toString();
            }

            String expiryInfo = "";
            if (invite.getExpiresAt() != null) {
                expiryInfo = "\n\nThis invitation expires on: " + invite.getExpiresAt().toString();
            }

            message.setText("Hello " + recipientName + ",\n\n" +
                    "You have been invited to participate in a study: " + study.getTitle() + "\n\n" +
                    "Study Description: " + (study.getDescription() != null && !study.getDescription().isBlank()
                            ? study.getDescription()
                            : "No description provided") +
                    "\n\nInvited by: " + invitedBy.getName() +
                    deadlineInfo +
                    expiryInfo +
                    "\n\nTo accept this invitation, please click the link below or log in to your dashboard:\n" +
                    inviteLink +
                    "\n\nIf you don't have an account yet, please register first at http://localhost:5173/register" +
                    "\n\nThank you,\nCodeArena Team");

            javaMailSender.send(message);
        } catch (Exception e) {

            System.err.println("Failed to send study invite notification email: " + e.getMessage());
            e.printStackTrace();
        }
    }
}

