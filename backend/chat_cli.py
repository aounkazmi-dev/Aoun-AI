"""Talk to the bot in the terminal.

    python chat_cli.py            # normal chat
    python chat_cli.py --debug    # also show which chunks were retrieved
"""
import argparse

import rag


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--debug", action="store_true", help="show retrieved chunks")
    args = parser.parse_args()

    print("Aoun AI (terminal). Ask about Aoun. Type 'exit' to quit.\n")
    history = []
    while True:
        try:
            question = input("you > ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            break
        if question.lower() in {"exit", "quit"}:
            break
        if not question:
            continue

        try:
            messages, chunks = rag.prepare(question, history)
        except ValueError as e:
            print(f"  ({e})\n")
            continue

        if args.debug:
            for c in chunks:
                print(f"  [{c['distance']:.3f}] {c['source']} > {c['section']}")

        print("bot > ", end="", flush=True)
        reply, info = "", {}
        for piece in rag.stream_reply(messages, info):
            print(piece, end="", flush=True)
            reply += piece
        print("\n" + (f"  (answered by {info.get('provider')})\n" if args.debug else ""))

        history += [
            {"role": "user", "content": question},
            {"role": "assistant", "content": reply},
        ]


if __name__ == "__main__":
    main()
