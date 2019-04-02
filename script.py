import shutil
import os

src  = '/Users/sharonk/Desktop/attach_file.txt'
dest_fol = '/Users/sharonk/PycharmProjects/Fakes3/tickets/{}'
dest = '/Users/sharonk/PycharmProjects/Fakes3/tickets/{}/{}.txt'

dest_comment = '/Users/sharonk/PycharmProjects/Fakes3/comments/{}/{}.txt'
dest_comment_fol = '/Users/sharonk/PycharmProjects/Fakes3/comments/{}'

csv_content = '{},Ticket Changed Subject {},Open,vikfdesk{}@gmail.com'

csv_data = 'Ticket_Id,Subject,Status,Requester_Email\n'

csv_comment_data = 'comment_id,ticket_id,description,private_note\n'

csv_comment_content ='{},{},comment changed{},true'

shutil.rmtree('/Users/sharonk/PycharmProjects/Fakes3/tickets')
os.mkdir('/Users/sharonk/PycharmProjects/Fakes3/tickets')

shutil.rmtree('/Users/sharonk/PycharmProjects/Fakes3/comments')
os.mkdir('/Users/sharonk/PycharmProjects/Fakes3/comments')

end_value = 10000

for i in range(500000,510000):
    dest_folder = dest_fol.format(i)
    os.mkdir(dest_folder)
    destination = dest.format(i,i)
    shutil.copy(src,destination)
    destination = dest.format(i,i+end_value)
    shutil.copy(src,destination)
    csv_data += csv_content.format(i,i,i) + '\n'

    dest_comment_folder = dest_comment_fol.format(i)
    os.mkdir(dest_comment_folder)
    destination = dest_comment.format(i, i)
    shutil.copy(src, destination)
    destination = dest_comment.format(i, i + end_value)
    shutil.copy(src, destination)

    dest_comment_folder = dest_comment_fol.format(i+end_value)
    os.mkdir(dest_comment_folder)

    destination = dest_comment.format(i + end_value, i)
    shutil.copy(src, destination)

    destination = dest_comment.format(i + end_value, i + end_value)
    shutil.copy(src, destination)

    csv_comment_data += csv_comment_content.format(i,i,i) + '\n' + csv_comment_content.format(i+end_value+1,i,i+end_value+1) +'\n'



file_data = open('tickets.csv','w')
file_data.write(csv_data)

file_data.close()

file_data = open('comment.csv','w')
file_data.write(csv_comment_data)

file_data.close()

os.remove('/Users/sharonk/PycharmProjects/Fakes3/tickets.zip')
