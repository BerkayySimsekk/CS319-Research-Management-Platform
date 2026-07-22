


package com.halenteck.demo.controller;

import com.halenteck.demo.dto.AuthResponse;
import com.halenteck.demo.dto.ParticipantFilterRequestDTO;
import com.halenteck.demo.dto.ParticipantWithScoresDTO;
import com.halenteck.demo.UserRole;
import com.halenteck.demo.entity.UserEntity;
import com.halenteck.demo.repository.UserRepository;
import com.halenteck.demo.security.CustomUserDetails;
import com.halenteck.demo.security.JwtTokenProvider;
import com.halenteck.demo.service.ParticipantService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;
import java.time.LocalDateTime;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@RestController
public class UserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final ParticipantService participantService;
    private final JavaMailSender javaMailSender;


    public UserController(UserRepository userRepository,
                          PasswordEncoder passwordEncoder,
                          AuthenticationManager authenticationManager,
                          JwtTokenProvider tokenProvider,
                          ParticipantService participantService,
                          JavaMailSender javaMailSender) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.tokenProvider = tokenProvider;
        this.participantService = participantService;
        this.javaMailSender = javaMailSender;

    }









    private record ParticipantDTO(Long id, String name) {}

    @GetMapping("/api/users/participants")
    public ResponseEntity<List<ParticipantDTO>> getParticipants() {

        List<ParticipantDTO> participants = userRepository.findAll()
                .stream()
                .filter(user -> user.getRole() == UserRole.PARTICIPANT)
                .map(user -> new ParticipantDTO(user.getId(), user.getName()))
                .collect(Collectors.toList());

        return ResponseEntity.ok(participants);
    }





    @GetMapping("/api/participants")
    public ResponseEntity<List<ParticipantWithScoresDTO>> getAllParticipantsWithScores() {
        List<ParticipantWithScoresDTO> participants = participantService.getAllParticipantsWithScores();
        return ResponseEntity.ok(participants);
    }





    @PostMapping("/api/participants/filter")
    public ResponseEntity<List<ParticipantWithScoresDTO>> filterParticipants(
            @RequestBody ParticipantFilterRequestDTO filterRequest) {
        List<ParticipantWithScoresDTO> filteredParticipants = participantService.filterParticipants(filterRequest);
        return ResponseEntity.ok(filteredParticipants);
    }

    private record ResearcherDTO(Long id, String name, String email) {}

    @GetMapping("/api/users/researchers")
    public ResponseEntity<List<ResearcherDTO>> getResearchers() {
        List<ResearcherDTO> researchers = userRepository.findAll()
                .stream()
                .filter(user -> user.getRole() == UserRole.RESEARCHER || user.getRole() == UserRole.ADMIN)
                .map(user -> new ResearcherDTO(user.getId(), user.getName(), user.getEmail()))
                .collect(Collectors.toList());
        return ResponseEntity.ok(researchers);
    }



    @GetMapping("/api/users")
    public ResponseEntity<List<UserEntity>> getAllUsers() {
        return ResponseEntity.ok(userRepository.findAll());
    }

    @PostMapping("/users")
    public ResponseEntity<UserEntity> createUser(@RequestBody UserEntity user) {
        UserEntity saved = userRepository.save(user);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody UserEntity userRequest) {
        if (userRepository.findByName(userRequest.getName()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "Username already exists"));
        }
        if (userRepository.findByEmail(userRequest.getEmail()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "Email already exists"));
        }


        UserRole role = userRequest.getRole();
        if (role == null) {
            role = UserRole.PARTICIPANT;
        } else {



            boolean isValidRole = role == UserRole.PARTICIPANT ||
                                  role == UserRole.RESEARCHER ||
                                  role == UserRole.REVIEWER ||
                                  role == UserRole.ADMIN;
            if (!isValidRole) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Invalid user role"));
            }
        }

        UserEntity newUser = new UserEntity();
        newUser.setName(userRequest.getName());
        newUser.setEmail(userRequest.getEmail());
        newUser.setPassword(passwordEncoder.encode(userRequest.getPassword()));
        newUser.setRole(role);


        newUser.setSkills(userRequest.getSkills() != null ? userRequest.getSkills() : "");
        newUser.setYearsOfExperience(userRequest.getYearsOfExperience() != null ? userRequest.getYearsOfExperience() : 0);

        userRepository.save(newUser);

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        userRequest.getName(),
                        userRequest.getPassword()
                )
        );

        String token = tokenProvider.generateToken(authentication);
        UserEntity authedUser = ((CustomUserDetails) authentication.getPrincipal()).getUserEntity();

        AuthResponse authResponse = new AuthResponse(
                token,
                authedUser.getId(),
                authedUser.getName(),
                authedUser.getEmail(),
                authedUser.getRole()
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(authResponse);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody UserEntity reqUser) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        reqUser.getName(),
                        reqUser.getPassword()
                )
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);

        String token = tokenProvider.generateToken(authentication);
        UserEntity authedUser = ((CustomUserDetails) authentication.getPrincipal()).getUserEntity();

        AuthResponse authResponse = new AuthResponse(
                token,
                authedUser.getId(),
                authedUser.getName(),
                authedUser.getEmail(),
                authedUser.getRole()
        );

        return ResponseEntity.ok(authResponse);
    }

    @DeleteMapping("/users")
    public ResponseEntity<?> deleteUser(@RequestParam String name) {
        Optional<UserEntity> user = userRepository.findByName(name);
        if (user.isPresent()) {
            userRepository.delete(user.get());
            return ResponseEntity.ok(Map.of("message", "User deleted successfully"));
        }
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "User not found"));
    }

    @PostMapping("/change-email")
    public ResponseEntity<?> changeEmail(@RequestBody Map<String, String> request, Principal principal) {
        String name = principal.getName();
        String newEmail = request.get("newEmail");

        Optional<UserEntity> userOpt = userRepository.findByName(name);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "User not found"));
        }

        if (newEmail == null || newEmail.isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "New email cannot be empty"));
        }

        if (userRepository.findByEmail(newEmail).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "Email already exists"));
        }

        UserEntity user = userOpt.get();
        user.setEmail(newEmail);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "Email updated successfully", "newEmail", newEmail));
    }





    @PutMapping("/api/users/{userId}/role")
    public ResponseEntity<?> updateUserRole(
            @PathVariable Long userId,
            @RequestBody Map<String, String> request,
            Principal principal) {


        Optional<UserEntity> requesterOpt = userRepository.findByName(principal.getName());
        if (requesterOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Requester not found"));
        }

        UserEntity requester = requesterOpt.get();
        if (requester.getRole() != UserRole.ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Only admins can update user roles"));
        }


        Optional<UserEntity> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "User not found"));
        }

        String newRoleStr = request.get("role");
        if (newRoleStr == null || newRoleStr.isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Role is required"));
        }


        UserRole newRole;
        try {
            newRole = UserRole.valueOf(newRoleStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Invalid role: " + newRoleStr));
        }


        if (userId.equals(requester.getId())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Cannot change your own role"));
        }

        UserEntity user = userOpt.get();
        user.setRole(newRole);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of(
                "message", "User role updated successfully",
                "userId", userId,
                "newRole", newRole.name()
        ));
    }



    private record ProfileDTO(Long id, String name, String email, String role, String skills, Integer yearsOfExperience) {}





    @GetMapping("/api/profile")
    public ResponseEntity<?> getProfile(Principal principal) {
        Optional<UserEntity> userOpt = userRepository.findByName(principal.getName());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "User not found"));
        }

        UserEntity user = userOpt.get();
        ProfileDTO profile = new ProfileDTO(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole().name(),
                user.getSkills(),
                user.getYearsOfExperience()
        );

        return ResponseEntity.ok(profile);
    }





    @PutMapping("/api/profile")
    public ResponseEntity<?> updateProfile(@RequestBody Map<String, Object> request, Principal principal) {
        Optional<UserEntity> userOpt = userRepository.findByName(principal.getName());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "User not found"));
        }

        UserEntity user = userOpt.get();


        if (request.containsKey("email")) {
            String newEmail = (String) request.get("email");
            if (newEmail != null && !newEmail.isBlank() && !newEmail.equals(user.getEmail())) {
                if (userRepository.findByEmail(newEmail).isPresent()) {
                    return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "Email already exists"));
                }
                user.setEmail(newEmail);
            }
        }


        if (request.containsKey("skills")) {
            String skills = (String) request.get("skills");
            user.setSkills(skills != null ? skills : "");
        }

        if (request.containsKey("yearsOfExperience")) {
            Object yearsObj = request.get("yearsOfExperience");
            if (yearsObj != null) {
                int years = yearsObj instanceof Integer ? (Integer) yearsObj : Integer.parseInt(yearsObj.toString());
                user.setYearsOfExperience(years);
            } else {
                user.setYearsOfExperience(0);
            }
        }

        userRepository.save(user);

        ProfileDTO profile = new ProfileDTO(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole().name(),
                user.getSkills(),
                user.getYearsOfExperience()
        );

        return ResponseEntity.ok(profile);
    }





    @PutMapping("/api/profile/password")
    public ResponseEntity<?> changePassword(@RequestBody Map<String, String> request, Principal principal) {
        Optional<UserEntity> userOpt = userRepository.findByName(principal.getName());
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "User not found"));
        }

        String currentPassword = request.get("currentPassword");
        String newPassword = request.get("newPassword");

        if (currentPassword == null || currentPassword.isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Current password is required"));
        }

        if (newPassword == null || newPassword.isBlank()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "New password is required"));
        }

        if (newPassword.length() < 4) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "New password must be at least 4 characters"));
        }

        UserEntity user = userOpt.get();


        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Current password is incorrect"));
        }


        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "Password updated successfully"));
    }



        @PostMapping("/forgot-password")
        public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> request) {
            String email = request.get("email");
            Optional<UserEntity> userOpt = userRepository.findByEmail(email);

            if (userOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Bu e-posta ile kayıtlı kullanıcı bulunamadı."));
            }

            UserEntity user = userOpt.get();
            String token = UUID.randomUUID().toString();
            user.setResetPasswordToken(token);
            user.setTokenExpirationTime(LocalDateTime.now().plusMinutes(30));
            userRepository.save(user);

            try {

                String resetLink = "http://localhost:5173/reset-password?token=" + token;


                SimpleMailMessage message = new SimpleMailMessage();
                message.setFrom("codearena.dev@gmail.com");
                message.setTo(user.getEmail());
                message.setSubject("CodeArena Şifre Sıfırlama");
                message.setText("Merhaba " + user.getName() + ",\n\n" +
                        "Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın:\n" +
                        resetLink + "\n\n" +
                        "Bağlantı 30 dakika geçerlidir.");


                javaMailSender.send(message);

                return ResponseEntity.ok(Map.of("message", "Sıfırlama bağlantısı e-posta adresinize gönderildi."));

            } catch (Exception e) {
                e.printStackTrace();
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(Map.of("error", "E-posta gönderilemedi: " + e.getMessage()));
            }
        }


    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> request) {
        String token = request.get("token");
        String newPassword = request.get("newPassword");

        Optional<UserEntity> userOpt = userRepository.findByResetPasswordToken(token);

        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Geçersiz token."));
        }

        UserEntity user = userOpt.get();


        if (user.getTokenExpirationTime().isBefore(LocalDateTime.now())) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Token süresi dolmuş."));
        }


        user.setPassword(passwordEncoder.encode(newPassword));

        user.setResetPasswordToken(null);
        user.setTokenExpirationTime(null);

        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "Şifreniz başarıyla güncellendi."));
    }



}
