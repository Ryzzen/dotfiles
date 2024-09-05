from pwn import *

context.terminal = ["kitty"]
context.update(arch="x86-64")
# context.log_level = "error"

exe = context.binary = ELF(args.EXE or "./NAME")
# libc = ELF("")


def start(argv=[], *a, **kw):
    if args.GDB:
        return gdb.debug([exe.path] + argv, gdbscript=gdbscript, *a, **kw)
    elif args.SSH:
        s = ssh(
            user="root",
            host="172.22.0.2",
            port=22,
            password="poun",
        )
        if args.GDB:
            return gdb.debug(exe.path, exe="NAME", ssh=s, gdbscript=gdbscript)
        else:
            return s.system("NAME")
    elif args.REM:
        return remote(host="127.0.0.1", port=8080)
    else:
        return process([exe.path] + argv, *a, **kw)


gdbscript = """
continue
""".format(
    **locals()
)


io = start()


io.interactive()
