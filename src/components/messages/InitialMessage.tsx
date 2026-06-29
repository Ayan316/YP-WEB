interface EmptyChatProps{
  userName?:string
}


export default function InitialMessages({userName}:EmptyChatProps) {
  return (
    <div className="flex flex-1 items-center justify-center text-gray-500">
      {userName ? `Start a conversation with ${userName}` : `Start a conversation`}
    </div>
  )
}