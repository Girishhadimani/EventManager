# KLS GIT Campus Event and Club Management System

A centralized, role-based event management and digital activity platform designed for **KLS Gogte Institute of Technology (KLS GIT), Belgaum**. The system manages end-to-end event operations across student clubs, including proposal reviews, participant registrations, integrated digital competition tools (coding execution, quiz evaluation, design canvas), live attendance check-ins, faculty scoring rubrics, and VTU activity points tracking.

---

## Test Login Credentials

Default test accounts for all four system roles are automatically initialized on a fresh database via `DataInitializer`:

| Role | Email Address | Password | Role Identifier | Permissions / Scope |
| :--- | :--- | :--- | :--- | :--- |
| **Developer / Admin** | `admin@college.edu` | `admin123` | `DEVELOPER` | Full system oversight, account provisioning, club configurations, and global settings. |
| **Faculty Coordinator** | `faculty@college.edu` | `faculty123` | `FACULTY_COORDINATOR` | Event approval workflow, 100-point rubric evaluations, and institution-wide registration analytics. |
| **Club Coordinator** | `coordinator@college.edu` | `coord123` | `COORDINATOR` | Multi-club event scheduling, tool configuration, participant check-in, and attendance export. |
| **Student** | `student@college.edu` | `student123` | `USER` | Event discovery, registration, digital entry passes, competition tools, and certificate access. |

*Note: On the authentication page (`/` or `index.html`), select the corresponding role in the role dropdown before submitting credentials.*

---

## Core Features and Modules

### 1. Multi-Role Authentication and Access Control
- **Role-Based Authorization**: JSON Web Token (JWT) secured endpoints with dedicated route guards for `DEVELOPER`, `FACULTY_COORDINATOR`, `COORDINATOR`, and `USER`.
- **Student Registration**: Automated onboarding capturing University Seat Number (USN), department, year of study, and optional email OTP validation.
- **Credential Management**: Password visibility controls on all authentication interfaces.
- **Multi-Club Coordination**: Coordinators can create and administer events across multiple college clubs without organizational restrictions.

---

### 2. Club Coordinator Dashboard (`coordinator.html`)
- **Event Proposal Workflow**: Create comprehensive event schedules specifying dates, times, venues, participant capacity limits, VTU activity points, and registration deadlines.
- **Event Categorization**: Support for diverse categories including Coding Competitions, Hackathons, Quizzes, Technical Workshops, Design Sprints, Sports Tournaments, and Project Exhibitions.
- **Integrated Digital Tool Configuration**: Enable targeted competition tools per event:
  - Code Editor and Compiler
  - Quiz Assessment Engine
  - Canvas Studio Design Tool
  - Project and Repository Submissions (GitHub, Live URL, Video)
  - Team Formation Management
  - Live Leaderboards
- **Event-Day Check-in Station**:
  - Searchable manual attendee verification interface.
  - Camera-based real-time QR code scanner for scanning student event passes.
- **Reporting and Data Export**: Export participant rosters and registration details to CSV format.

---

### 3. Faculty Review and Evaluation Panel (`faculty.html`)
- **Event Review Queue**: Scrutinize incoming event submissions from club coordinators with options to approve or provide structured rejection feedback.
- **100-Point Standardized Judging Rubric**: Evaluate competitor project submissions across standardized criteria:
  - Innovation and Novelty (Maximum: 20 points)
  - Technical Depth (Maximum: 20 points)
  - User Interface and Experience (Maximum: 15 points)
  - Real-World Impact and Utility (Maximum: 20 points)
  - Presentation Quality (Maximum: 10 points)
  - Working Prototype / Demonstration (Maximum: 15 points)
- **Capacity Monitoring**: Live metric cards and progress indicators tracking total registrations, confirmed seats, waitlists, and attendance rates across all clubs.
- **Faculty Directory**: Directory management for department representatives and faculty mentors.

---

### 4. Student Hub and Competition Workspace (`user.html`)
- **Event Discovery**: Filterable catalog of active and upcoming college events with real-time seat availability.
- **Registration and Digital Pass Generation**:
  - Streamlined registration supporting both individual participants and team entries.
  - Digital event ticket generation with unique verification QR codes and real-time check-in indicators.
- **In-Browser Interactive Event Tools**:
  - **Coding Studio**: Multi-language code editor (Java, Python, C++, JavaScript) with sample execution and test cases.
  - **Canvas Design Studio**: Vector drawing and graphics editor with tool palettes, layers, and PNG export capability.
  - **Quiz Engine**: Timed multiple-choice assessments with immediate scoring and review.
  - **Project Submissions**: Submission interface for repository links, deployment URLs, and multimedia previews.
  - **Live Leaderboard**: Real-time ranking updates and aggregate score breakdowns.
- **VTU Activity Points and Certificates**: Track accumulated AICTE/VTU activity credit points and download verifiable certificates.

---

### 5. System Administration and Developer Console (`developer.html`)
- **Platform Telemetry**: Overview of system statistics including active users, registered clubs, total submissions, and scheduled events.
- **User Management**: Create, inspect, update status, and reset passwords across all account types.
- **Club Administration**: Provision and update club profiles, branding assets, meeting schedules, and primary venues.
- **System Settings**: College branding, announcement notices, automated email notifications, and domain configuration.

---

### 6. Public Services and Verification
- **Club Profiles (`club.html`)**: Public-facing information pages highlighting club objectives, upcoming schedules, leadership rosters, and achievements.
- **Certificate Verification (`verify-certificate.html`)**: Public portal for verifying the authenticity of participation and achievement certificates via unique Certificate IDs or QR codes.

---

## Technical Architecture

| Layer | Component |
| :--- | :--- |
| **Backend Framework** | Spring Boot 4.x, Java 21 |
| **Security Layer** | Spring Security with Stateless JWT Authentication |
| **Persistence** | Spring Data JPA, Hibernate ORM |
| **Database** | PostgreSQL |
| **Frontend Architecture** | Semantic HTML5, Vanilla CSS3 (Custom Design System), Modern JavaScript (ES6+) |
| **Client Capabilities** | HTML5 Canvas API, WebRTC Camera Stream (QR Scanning), Chart.js |
| **Communication** | JavaMailSender (Transactional Email and OTP) |
| **Build Automation** | Apache Maven |

---

## Local Development and Deployment

### System Requirements
- **Java Development Kit (JDK)**: Version 21 or higher
- **Apache Maven**: Version 3.8+ (or bundled wrapper)
- **PostgreSQL**: Version 14+ running on port `5432`

### 1. Database Initialization
Create the target PostgreSQL database:
```sql
CREATE DATABASE club_management;
```

### 2. Environment Configuration
Verify configuration parameters in `src/main/resources/application.properties` or set corresponding environment variables:
```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/club_management
spring.datasource.username=postgres
spring.datasource.password=YOUR_DATABASE_PASSWORD
```

### 3. Build and Execution
Compile the project and start the server:
```bash
# Build the project
mvn clean install -DskipTests

# Start the application
mvn spring-boot:run
```

The application can also be executed directly via `EventManagerApplication.java` in any Java IDE.

### 4. Application Access
Open a web browser and navigate to:
```
http://localhost:8080
```
Authenticate using any of the provided [Test Login Credentials](#test-login-credentials).

---

## Directory Structure

```
EventManager/
|-- pom.xml                                      # Build configuration and project dependencies
|-- README.md                                    # System documentation and test credentials
`-- src/
    `-- main/
        |-- java/com/example/EventManager/
        |   |-- EventManagerApplication.java    # Application entry point
        |   |-- config/                         # Data initializers and security configuration
        |   |-- controller/                     # REST API Controllers
        |   |-- dto/                            # Data Transfer Objects
        |   |-- entity/                         # JPA domain models
        |   |-- enums/                          # Domain enumerations
        |   |-- exception/                      # Global exception handlers
        |   |-- repository/                     # Spring Data JPA repositories
        |   |-- security/                       # JWT filter and service implementations
        |   `-- service/                        # Domain service layer
        `-- resources/
            |-- application.properties          # Server and datasource configuration
            `-- static/                         # Web frontend assets
                |-- css/
                |   `-- style.css               # Design system and theme definitions
                |-- js/
                |   |-- auth.js                 # Authentication client and route guards
                |   |-- coordinator.js          # Coordinator dashboard controller
                |   |-- developer.js            # Administrator console controller
                |   |-- faculty.js              # Faculty evaluation controller
                |   |-- home.js                 # Public landing page controller
                |   `-- user.js                 # Student workspace controller
                |-- images/                     # Institutional branding assets
                |-- index.html                  # Main authentication portal
                |-- coordinator.html            # Club coordinator portal
                |-- faculty.html                # Faculty review portal
                |-- developer.html              # Administrator dashboard
                |-- user.html                   # Student portal
                |-- club.html                   # Public club showcase
                `-- verify-certificate.html     # Public certificate verification
```

---

## Institutional Attribution
Developed for institutional and campus club operations at **KLS Gogte Institute of Technology (KLS GIT), Belgaum**.
