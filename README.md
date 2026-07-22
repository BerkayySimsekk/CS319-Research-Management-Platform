## Team Members
- Ali Şen 
- Barış Peksak 
- Berkay Şimşek 
- Gökay Nuray 
- Muhammet Furkan Demir

## About the Project

This project is a research management platform for conducting structured studies that compare software artifacts created by humans and AI. Researchers can organize studies, upload artifacts, assess participant competency, assign evaluation tasks, and collect blinded ratings and feedback through one web application.

## Tech Stack

- **Frontend:** React 19, Vite, React Router, Axios, Framer Motion, Lucide React, and React Flow
- **Backend:** Java 21, Spring Boot 3, Spring Web, Spring Security, Spring Data JPA, WebFlux, and JWT authentication
- **Database:** PostgreSQL 15
- **Infrastructure:** Docker, Docker Compose, Nginx, Gradle, and npm

## Running the Program

### With Docker Compose

1. Install Docker Desktop and ensure Docker Compose is available.
2. Copy `.env.example` to `.env`, replace `POSTGRES_PASSWORD`, and set `JWT_SECRET` to a Base64-encoded random key. Set the optional integration values if needed.
3. From the project root, run:

	```bash
	docker compose up --build
	```

4. Open `http://localhost:5173` in a browser. The backend API is available at `http://localhost:8080`.

### Without Docker

1. Install Java 21, PostgreSQL 15 or later, and Node.js with npm.
2. Create a PostgreSQL database named `demodb` and export the backend environment variables in the terminal that will run Spring Boot. Set `JWT_SECRET` and `SPRING_DATASOURCE_PASSWORD`; override the database URL and username if the local defaults do not apply.
3. Start the backend:

	```bash
	cd backend
	./gradlew bootRun
	```

	On Windows, use `gradlew.bat bootRun`.

4. In another terminal, start the frontend:

	```bash
	cd frontend
	npm install
	npm run dev
	```

5. Open the URL shown by Vite, normally `http://localhost:5173`.

### Environment Variables

- `JWT_SECRET`: Required Base64-encoded signing key for authentication tokens. A value can be generated with `openssl rand -base64 64`.
- `POSTGRES_PASSWORD`: Required by Docker Compose for the PostgreSQL account.
- `GROQ_API_KEY`: Optional GroqCloud API key for AI-assisted features.
- `MAIL_USERNAME`: Optional SMTP account username for email notifications.
- `MAIL_PASSWORD`: Optional SMTP account password or app password.

For a manual backend run, database settings can be overridden with `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, and `SPRING_DATASOURCE_PASSWORD`.

## Main Functionalities

- Registration, login, password recovery, profiles, and role-based access for administrators, researchers, reviewers, and participants
- Study creation and management, including collaborators, participants, tasks, and audit logs
- Uploading, versioning, tagging, linking, moving, downloading, and organizing software artifacts
- Quiz and questionnaire creation for participant competency assessment
- Assigned participant workflows for taking assessments and completing evaluations
- Standard and blinded artifact evaluation modes with ratings, comments, and submission tracking
- Researcher and reviewer dashboards for progress monitoring, study statistics, and result analysis
- Administrative user and role management
