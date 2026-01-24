# Use a Node base image with a full OS for development
FROM node:18-bullseye

# Set the working directory for the container
WORKDIR /workspace

# Update npm and install globally required packages (concurrently lets you run multiple scripts in one terminal)
RUN npm install -g npm@latest concurrently

# Expose the default ports for our applications:
# - Port 3000: Next.js dev server (frontend)
# - Port 3001: Express backend dev server
EXPOSE 3000 3001

# You do not copy our source in this Dockerfile because VS Code
# automatically mounts the repository for dev container projects.
#
# (If you want to run a one-time setup script, you might add additional RUN commands here.)

# Open a bash shell by default; the devcontainer configuration may provide additional tasks.
CMD ["bash"]
