sudo apt update
sudo apt upgrade

echo 'PasswordAuthentication no' | sudo tee /etc/ssh/sshd_config.d/memmy_config.conf
echo 'PermitRootLogin no' | sudo tee -a /etc/ssh/sshd_config.d/memmy_config.conf
echo 'Include /etc/ssh/sshd_config.d/memmy_config.conf' | sudo tee -a /etc/ssh/sshd_config

sudo systemctl restart sshd

sudo apt install -y nginx
sudo apt install -y mariadb-server

sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | sudo gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg

NODE_MAJOR=20
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | sudo tee /etc/apt/sources.list.d/nodesource.list

sudo apt install -y nodejs

sudo npm install yarn -g

yarn install

node ace build --production

echo 'Setup complete!'
