CREATE TABLE Roles(
    RoleID INT IDENTITY(1,1) PRIMARY KEY,
    RoleName NVARCHAR(50) UNIQUE NOT NULL,
    Description NVARCHAR(200)
);


INSERT INTO Roles (RoleName, Description)
VALUES 
('Admin','Has full access perms'),
('Caregiver','Has access to their own patients and records'),
('Patient','Has access to personal profile and messages');