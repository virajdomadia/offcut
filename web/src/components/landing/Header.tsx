export function Header() {
  return (
    <header className="wrap">
      <nav className="nav" aria-label="Main">
        <a className="logo" href="#"><svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" fill="#000"/><circle cx="32" cy="32" r="18" fill="none" stroke="#fff" strokeWidth="7"/><polygon points="34,6 64,6 64,36" fill="#000"/><polygon points="36,4 64,4 64,32" fill="#D6FF3B" transform="translate(2 -2)"/></svg>Offcut</a>
        <ul><li><a href="#new">New</a></li><li><a href="#">Tees</a></li><li><a href="#">Cargos</a></li><li><a href="#">Caps</a></li><li><a href="#look">Shop the look</a></li></ul>
        <div className="right"><a href="#">Search</a><a href="#">Account</a><a className="bag" href="#">Bag 2</a></div>
      </nav>
    </header>
  );
}
