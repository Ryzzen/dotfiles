wal --iterative -i ~/.config/ressources/images/wallpapers/
swww img "$(< "${HOME}/.cache/wal/wal")"
pkill "waybar"
waybar &
